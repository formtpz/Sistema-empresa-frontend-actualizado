# Como abrir el aplicativo para la presentacion

Carpeta del programa:

```text
C:\Users\esaim\Documents\Codex\2026-05-17\files-mentioned-by-the-user-dev\extracted\Dev\Sistema-empresa\frontend
```

## Opcion rapida

1. Abri Docker Desktop.
2. Entra a la carpeta del programa.
3. Dale doble clic a:

```text
iniciar-programa.cmd
```

4. Cuando la ventana diga que abrias el navegador, entra a:

```text
http://127.0.0.1:3000/login
```

Deja esa ventana negra abierta mientras estes presentando.

## Opcion desde Visual Studio Code

1. Abri Visual Studio Code.
2. Menu `File` -> `Open Folder`.
3. Selecciona esta carpeta:

```text
C:\Users\esaim\Documents\Codex\2026-05-17\files-mentioned-by-the-user-dev\extracted\Dev\Sistema-empresa\frontend
```

4. Abri la terminal integrada:

```text
Terminal -> New Terminal
```

5. Ejecuta:

```powershell
docker compose up -d
npx prisma migrate deploy
npm run build
npm run start
```

6. Abri:

```text
http://127.0.0.1:3000/login
```

## Si algo falla

- Si dice que no conecta a `localhost:5432`, abri Docker Desktop y corre:

```powershell
docker compose up -d
```

- Si el puerto `3000` esta ocupado, cerra otras ventanas donde este corriendo Node/Next y vuelve a ejecutar:

```powershell
npm run start
```

- Para detener el aplicativo, en la terminal presiona:

```text
Ctrl+C
```
