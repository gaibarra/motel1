import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta charSet="UTF-8" />
        {/* Incluye tus estilos y scripts adicionales aquí */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
