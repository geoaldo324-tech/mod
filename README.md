<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:d02feed351622d9fe6bc95f16097fda29bfa2d66bc5757c4640bf2f598d914b5 -->

# Mosaico Studio

Aplicación de escritorio para crear, entrenar y probar agentes de IA. Esta versión permite entrenar un clasificador local para tres acciones, conectarlo a Lola en un simulador 3D y guardar sus pruebas en el diario.

## Abrir la aplicación

Con Node.js 24 y Python 3.12 o posterior:

```sh
npm ci
npm run build
python mosaico.py --open
```

También puedes abrir [Mosaico Studio en el equipo local](http://127.0.0.1:4173/). El servidor se enlaza a la interfaz local de forma predeterminada.

## Hacer una prueba

1. En **IA**, usa los ejemplos iniciales o añade frases y sus acciones. Pulsa **Entrenar** y prueba una frase nueva.
2. Pulsa **Usar con Lola** y envía la frase en **Escena**. También puedes arrastrar un GLB que incluya sus propios recursos. Sin WebGL el simulador usa una vista simplificada que conserva las acciones y los controles de cámara.
3. Abre **Diario** para ver las órdenes y sus resultados. Guarda el proyecto o expórtalo desde **Inicio** para llevarlo a otro equipo. El guardado local conserva el último proyecto; la exportación conserva copias independientes.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:98e62248ea7555b1eb230dca16fdd4dcb6722c5123510061d7ee24790fc53607 -->

## Conversación con modelos locales

Instala e inicia Ollama en este equipo y descarga allí al menos un modelo compatible. En **IA**, usa **Buscar modelos**, elige un modelo y pulsa **Usar para conversar**. Define la personalidad y los recuerdos en el mismo panel; se envían al modelo local junto con la conversación.

Puedes elegir otro modelo durante una conversación. La personalidad, los recuerdos y el historial permanecen en el proyecto: guarda los cambios para conservarlos. **Volver a órdenes 3D** recupera el control del simulador. Los proyectos anteriores se abren con un perfil de conversación nuevo. Ollama y sus modelos se instalan por separado.

## Windows

<!-- /coderabbit-ai-generated:v1 -->

En Windows de 64 bits, instala Node.js 24, Python 3.12 de 64 bits e Inno Setup 6.3 o posterior. La aplicación usa el runtime de Microsoft Edge WebView2 en el equipo de destino.

```powershell
powershell -File scripts/build-windows.ps1
```

El script produce `release/MosaicoStudio.exe` y `release/MosaicoStudio-Setup.exe`. Usa `-SkipInstaller` para generar solo el ejecutable. Los proyectos se guardan en `%LOCALAPPDATA%\Mosaico Studio`, aparte de la instalación.

## Pruebas

```sh
npm test
python -m unittest discover -s tests -p 'test_*.py'
```


<!-- /coderabbit-ai-generated:v1 -->