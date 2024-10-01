from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from django.core.mail import EmailMessage, BadHeaderError
from django.conf import settings
from django.http import HttpResponse
from .models import Employee, Shift, Room, Payment, TurnCash, CashMovement, RoomHistory
from .serializers import EmployeeSerializer, ShiftSerializer, RoomSerializer, PaymentSerializer, TurnCashSerializer, CashMovementSerializer
from datetime import timedelta
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
        })

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_update(serializer)
            logger.info("Shift updated successfully.")
        except Exception as e:
            logger.error(f"Error while updating shift: {str(e)}", exc_info=True)
            return Response({"detail": f"Error al actualizar el turno: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.data)



class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    lookup_field = 'number'

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        previous_status = instance.status

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        try:
            # Manejar estado "Ocupado" (OC) - Registro de ocupación
            if request.data.get('status') == 'OC' and previous_status != 'OC':
                self.handle_occupation(instance, request.data)
            
            # Manejar renovación si el estado permanece "Ocupado" (OC)
            elif previous_status == 'OC' and request.data.get('status') == 'OC':
                self.handle_renewal(instance, request.data)

            # Manejar cambio a "Sucio" (CL) desde cualquier estado anterior
            elif request.data.get('status') == 'CL':
                instance.cleaning_start_time = timezone.now()
                instance.save()

            # Ejecutar la actualización general
            self.perform_update(serializer)

            # Registrar el historial de cambios de estado
            RoomHistory.objects.create(
                room=instance,
                previous_status=previous_status,
                new_status=instance.status
            )

        except Exception as e:
            logger.error(f"Error al actualizar la habitación: {str(e)}", exc_info=True)
            return Response({"detail": f"Error al actualizar la habitación: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.data)

    def handle_occupation(self, room, data):
        try:
            payment_amount = float(data.get('payment_amount', room.rent_price))
            vehicle_info = data.get('vehicle_info', '')
            rent_duration = int(data.get('rent_duration', 4))

            # Crear un nuevo registro de Payment con el tiempo actual
            payment = Payment.objects.create(
                room=room,
                payment_time=timezone.now(),
                payment_amount=payment_amount,
                vehicle_info=vehicle_info,
                rent_duration=rent_duration
            )

            # Actualizar los datos de la habitación
            room.occupation_time = payment.payment_time
            room.expiry_time = payment.payment_time + timedelta(hours=rent_duration)
            room.total_hours = rent_duration
            room.is_renewal = False
            room.save()

            # Crear movimiento de caja asociado a la ocupación
            self.create_cash_movement(room, payment_amount, vehicle_info, rent_duration)

        except Exception as e:
            logger.error(f"Error en handle_occupation: {str(e)}", exc_info=True)
            raise ValidationError(f"Error en handle_occupation: {str(e)}")

    def handle_renewal(self, room, data):
       try:
           # Obtener el último pago registrado para la habitación
           last_payment = Payment.objects.filter(room=room).order_by('-payment_time').first()

           # Calcular la nueva duración de la renta basada en los datos recibidos en la solicitud
           new_rent_duration = int(data.get('rent_duration', 1))  # Aquí se calcula `new_rent_duration`
           
           additional_amount = float(data.get('payment_amount', 0))

           if last_payment:
               # Sumar la nueva duración de la renta a las horas totales acumuladas
               total_rent_duration = room.total_hours + new_rent_duration

               # Calcular el tiempo de expiración basado en el tiempo de ocupación original más todas las horas acumuladas
               room.expiry_time = room.occupation_time + timedelta(hours=total_rent_duration)
               room.total_hours = total_rent_duration
               room.is_renewal = True
               room.save()

               # Registrar el nuevo pago asociado a la renovación
               renewal_payment = Payment.objects.create(
                   room=room,
                   payment_time=timezone.now(),
                   payment_amount=additional_amount,
                   vehicle_info=last_payment.vehicle_info,
                   rent_duration=new_rent_duration  # Aquí se utiliza `new_rent_duration`
               )

               # Crear movimiento de caja asociado a la renovación
               self.create_cash_movement(room, additional_amount, last_payment.vehicle_info, new_rent_duration)

       except Exception as e:
           logger.error(f"Error en handle_renewal: {str(e)}", exc_info=True)
           raise ValidationError(f"Error en handle_renewal: {str(e)}")

    
    def create_cash_movement(self, room, amount, vehicle_info, rent_duration):
        try:
            current_turn = TurnCash.objects.filter(is_closed=False).order_by('-turn_time').first()
            if current_turn:
                CashMovement.objects.create(
                    turn_cash=current_turn,
                    movement_type='entrada',
                    amount=amount,
                    concept=f"Room-{room.number} {vehicle_info} {rent_duration} horas"
                )
                logger.info(f"Movimiento de caja creado para la renta de la habitación {room.number} por el monto de {amount}.")
            else:
                logger.warning("No se encontró un turno activo para registrar el movimiento de caja.")
        except Exception as e:
            logger.error(f"Error al crear el movimiento de caja: {str(e)}", exc_info=True)
            raise ValidationError(f"Error al crear el movimiento de caja: {str(e)}")



class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

class TurnCashViewSet(viewsets.ModelViewSet):
    queryset = TurnCash.objects.all()
    serializer_class = TurnCashSerializer

    def perform_create(self, serializer):
        try:
            logger.info("Iniciando creación de un nuevo turno de caja.")
            previous_turn = TurnCash.objects.filter(is_closed=False).order_by('-turn_time').first()
            if previous_turn:
                logger.info(f"Turno anterior encontrado: ID={previous_turn.id}")
                pdf_file = self.generate_report_for_turn(previous_turn)
                previous_turn.is_closed = True
                previous_turn.save()
                logger.info(f"Turno anterior cerrado: ID={previous_turn.id}")

                self.send_report_via_email(previous_turn, pdf_file)
                logger.info("Correo electrónico con el reporte enviado exitosamente.")

            turn_cash = serializer.save()
            logger.info(f"Nuevo turno creado: ID={turn_cash.id}")
        except Exception as e:
            logger.error(f"Error al crear el nuevo turno: {e}")
            raise

    def generate_report_for_turn(self, turn_cash):
        try:
            movements = CashMovement.objects.filter(turn_cash=turn_cash)
            logger.info(f"Generando reporte para el turno: ID={turn_cash.id}, Movimientos={len(movements)}")

            total_entradas = sum(mov.amount for mov in movements if mov.movement_type == 'entrada')
            total_salidas = sum(mov.amount for mov in movements if mov.movement_type == 'salida')
            saldo_final = turn_cash.turn_amount + total_entradas - total_salidas
        
            current_timezone = timezone.get_current_timezone()
            hora_inicio = turn_cash.turn_time.astimezone(current_timezone).strftime("%Y-%m-%d %H:%M")
            hora_cierre = timezone.now().astimezone(current_timezone).strftime("%Y-%m-%d %H:%M")
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter

            p.drawString(100, height - 50, f'Reporte de Turno #{turn_cash.id}')
            p.drawString(100, height - 70, f'Responsable: {turn_cash.employee.name}')
            p.drawString(100, height - 90, f'Hora de inicio: {hora_inicio}')
            p.drawString(100, height - 110, f'Efectivo inicial: ${turn_cash.turn_amount:.2f}')
            p.drawString(100, height - 130, f'Total de entradas: ${total_entradas:.2f}')
            p.drawString(100, height - 150, f'Total de salidas: ${total_salidas:.2f}')
            p.drawString(100, height - 170, f'Efectivo final: ${saldo_final:.2f}')
            p.drawString(100, height - 190, f'Hora de cierre: {hora_cierre}')

            if turn_cash.turn_description:
                p.drawString(100, height - 210, f'Comentarios: {turn_cash.turn_description}')

            y = height - 230
            p.setFillColor(colors.grey)
            p.rect(95, y - 5, 410, 20, fill=True, stroke=False)
            p.setFillColor(colors.black)
            p.drawString(100, y, "Fecha y Hora")
            p.drawString(200, y, "Tipo")
            p.drawString(300, y, "Monto")
            p.drawString(400, y, "Descripción")

            y -= 20
            for mov in movements:
                p.drawString(100, y, mov.date.astimezone(current_timezone).strftime("%Y-%m-%d %H:%M"))
                p.drawString(200, y, mov.movement_type)
                p.drawString(300, y, f'${mov.amount:.2f}')
                p.drawString(400, y, mov.concept)
                y -= 20
            p.showPage()
            p.save()
            buffer.seek(0)
            
            logger.info(f"Reporte generado exitosamente para el turno: ID={turn_cash.id}")
            return buffer
        except Exception as e:
            logger.error(f"Error al generar el reporte del turno: {e}")
            raise

    def send_report_via_email(self, turn_cash, pdf_file):
        try:
            movements = CashMovement.objects.filter(turn_cash=turn_cash)
            total_entradas = sum(mov.amount for mov in movements if mov.movement_type == 'entrada')
            total_salidas = sum(mov.amount for mov in movements if mov.movement_type == 'salida')
            saldo_final = turn_cash.turn_amount + total_entradas - total_salidas
            current_timezone = timezone.get_current_timezone()
            hora_inicio = turn_cash.turn_time.astimezone(current_timezone).strftime("%Y-%m-%d %H:%M")
            hora_cierre = timezone.now().astimezone(current_timezone).strftime("%Y-%m-%d %H:%M")
            
            email_body = f"""
            <html>
            <body>
                <h2>Reporte de Turno #{turn_cash.id}</h2>
                <p><strong>Responsable:</strong> {turn_cash.employee.name}</p>
                <p><strong>Hora de inicio:</strong> {hora_inicio}</p>
                <p><strong>Efectivo inicial:</strong> ${turn_cash.turn_amount:.2f}</p>
                <p><strong>Total de entradas:</strong> ${total_entradas:.2f}</p>
                <p><strong>Total de salidas:</strong> ${total_salidas:.2f}</p>
                <p><strong>Efectivo final:</strong> ${saldo_final:.2f}</p>
                <p><strong>Hora de cierre:</strong> {hora_cierre}</p>
                {"<p><strong>Comentarios:</strong> " + turn_cash.turn_description + "</p>" if turn_cash.turn_description else ""}
                <table border="1" cellspacing="0" cellpadding="4">
                    <thead>
                        <tr style="background-color: #d3d3d3;">
                            <th>Fecha y Hora</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            for mov in movements:
                email_body += f"""
                    <tr>
                        <td>{mov.date.astimezone(current_timezone).strftime("%Y-%m-%d %H:%M")}</td>
                        <td>{mov.movement_type}</td>
                        <td>${mov.amount:.2f}</td>
                        <td>{mov.concept}</td>
                    </tr>
                """
            email_body += """
                    </tbody>
                </table>
            </body>
            </html>
            """
    
            email = EmailMessage(
                subject=f'Reporte de Turno #{turn_cash.id}',
                body=email_body,
                from_email=settings.EMAIL_HOST_USER,
                to=['motel1@hotmail.com'],
            bcc=['gaibarra@hotmail.com']
        )
            email.attach(f'Turno_{turn_cash.id}_reporte.pdf', pdf_file.read(), 'application/pdf')
            email.content_subtype = "html"
            
            # Intentar enviar el correo
            email.send()
            logger.info(f"Correo electrónico enviado exitosamente para el turno: ID={turn_cash.id}")
        except BadHeaderError:
            logger.error("Error al enviar el correo: Cabecera de correo no válida.")
            raise ValidationError("Error al enviar el correo: Cabecera de correo no válida.")
        except Exception as e:
            logger.error(f"Error al enviar el correo electrónico: {e}")
            raise ValidationError(f"Error al enviar el correo electrónico: {e}")
    

    @action(detail=False, methods=['get'])
    def current(self, request):
        try:
            current_turn = TurnCash.objects.filter(is_closed=False).order_by('-turn_time').first()
            if not current_turn:
                logger.warning("No se encontró un turno activo.")
                return Response({"detail": "No active turn found"}, status=status.HTTP_404_NOT_FOUND)
            logger.info(f"Turno activo encontrado: ID={current_turn.id}")
            return Response(TurnCashSerializer(current_turn).data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al obtener el turno actual: {e}")
            return Response({"detail": "Error al obtener el turno actual"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def last_turn_report(self, request):
        try:
            last_turn = TurnCash.objects.order_by('-turn_time').first()
            if not last_turn:
                return Response({"detail": "No previous turn found"}, status=status.HTTP_404_NOT_FOUND)

            movements = CashMovement.objects.filter(turn_cash=last_turn)
            total_entradas = sum(mov.amount for mov in movements if mov.movement_type == 'entrada')
            total_salidas = sum(mov.amount for mov in movements if mov.movement_type == 'salida')
            saldo = last_turn.turn_amount + total_entradas - total_salidas

            movement_data = CashMovementSerializer(movements, many=True).data

            report = {
                "id": last_turn.id,
                "employee": EmployeeSerializer(last_turn.employee).data,
                "turn_amount": last_turn.turn_amount,
                "total_entradas": total_entradas,
                "total_salidas": total_salidas,
                "saldo": saldo,
                "turn_description": last_turn.turn_description,
                "turn_time": last_turn.turn_time,
                "movements": movement_data
            }

            return Response(report, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": "Error al obtener el reporte del último turno"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def generate_current_turn_report(self, request):
        try:
            current_turn = TurnCash.objects.filter(is_closed=False).order_by('-turn_time').first()
            if not current_turn:
                logger.warning("No se encontró un turno activo para generar el reporte.")
                return Response({"detail": "No active turn found"}, status=status.HTTP_404_NOT_FOUND)
            
            pdf_file = self.generate_report_for_turn(current_turn)

            response = HttpResponse(pdf_file.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Turno_{current_turn.id}_reporte.pdf"'
            pdf_file.close()
            
            logger.info(f"Reporte del turno actual generado exitosamente: ID={current_turn.id}")
            return response
        except Exception as e:
            logger.error(f"Error al generar el reporte del turno actual: {e}")
            return Response({"detail": "Error al generar el reporte del turno actual"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def current_turn_movements(self, request):
        try:
            current_turn = TurnCash.objects.filter(is_closed=False).order_by('-turn_time').first()
            if not current_turn:
                return Response({"detail": "No active turn found"}, status=status.HTTP_404_NOT_FOUND)

            movements = CashMovement.objects.filter(turn_cash=current_turn)
            serializer = CashMovementSerializer(movements, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al obtener los movimientos del turno actual: {e}")
            return Response({"detail": "Error al obtener los movimientos del turno actual"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CashMovementViewSet(viewsets.ModelViewSet):
    queryset = CashMovement.objects.all()
    serializer_class = CashMovementSerializer

    def perform_create(self, serializer):
        try:
            turn_cash = TurnCash.objects.filter(is_closed=False).order_by('-turn_time').first()
            if turn_cash:
                serializer.save(turn_cash=turn_cash)
                logger.info(f"Movimiento de caja registrado exitosamente para el turno: ID={turn_cash.id}")
            else:
                logger.warning("No se encontró un turno activo para registrar el movimiento de caja.")
                return Response({"detail": "No active turn found"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error al registrar el movimiento de caja: {e}", exc_info=True)
            raise

class CurrentBalanceView(APIView):
    def get(self, request, turn_cash_id):
        try:
            turn_cash = TurnCash.objects.get(id=turn_cash_id)
            movements = CashMovement.objects.filter(turn_cash=turn_cash)
            total_entradas = sum(mov.amount for mov in movements if mov.movement_type == 'entrada')
            total_salidas = sum(mov.amount for mov in movements if mov.movement_type == 'salida')
            current_balance = turn_cash.turn_amount + total_entradas - total_salidas
            return Response({"balance": current_balance}, status=status.HTTP_200_OK)
        except TurnCash.DoesNotExist:
            return Response({"error": "TurnCash not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_occupation_time(request, number):
    try:
        room = Room.objects.get(number=number)
        
        if room.status == 'OC':
            data = {
                "occupation_time": room.occupation_time,
                "expiry_time": room.expiry_time,
                "vehicle_info": None,  # No se busca información del vehículo para la renta inicial
                "rent_duration": room.total_hours,
            }
            return Response(data, status=status.HTTP_200_OK)
        else:
            # Devolver una respuesta vacía o un mensaje indicando que no hay datos de ocupación
            data = {
                "occupation_time": None,
                "expiry_time": None,
                "vehicle_info": None,
                "rent_duration": 0
            }
            return Response(data, status=status.HTTP_200_OK)
    except Room.DoesNotExist:
        logger.error(f"Room with number {number} does not exist.")
        return Response({"detail": "Room not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error fetching occupation time for room {number}: {str(e)}")
        return Response({"detail": f"Error fetching occupation time for room {number}: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_last_payment_for_room(request, number):
    try:
        payment = Payment.objects.filter(room__number=number).order_by('-payment_time').first()
        if payment:
            return Response({
                'vehicle_info': payment.vehicle_info,
                'payment_amount': payment.payment_amount,
            })
        return Response({'error': 'No payment found for this room'}, status=status.HTTP_404_NOT_FOUND)
    except Payment.DoesNotExist:
        return Response({'error': 'No payment found for this room'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def get_last_vehicle_info(request, number):
    try:
        payment = Payment.objects.filter(room__number=number).order_by('-payment_time').first()
        if payment:
            return Response({'vehicle_info': payment.vehicle_info})
        return Response({'vehicle_info': ''}, status=200)
    except Payment.DoesNotExist:
        return Response({'vehicle_info': ''}, status=200)

@api_view(['GET'])
def get_renewal_details(request, number):
    try:
        vehicle_info = request.query_params.get('vehicle_info', '')

        if not vehicle_info:
            return Response({'error': 'Vehicle information is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        payments = Payment.objects.filter(
            room__number=number,
            vehicle_info=vehicle_info
        ).order_by('payment_time')

        if payments.exists():
            first_payment = payments.first()
            last_payment = payments.last()
            occupation_time = first_payment.payment_time
            total_hours = sum(payment.rent_duration for payment in payments)
            expiry_time = occupation_time + timedelta(hours=total_hours)

            return Response({
                'occupation_time': occupation_time,
                'expiry_time': expiry_time,
                'total_hours': total_hours
            })
        else:
            return Response({'error': 'No payments found for this room and vehicle'}, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)