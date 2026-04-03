@echo off
setlocal
set "ROOT=%~dp0"
set "VENDAS=%ROOT%sistema-cadastro-clientes\vendas.js"
echo ==========================================================
echo   VERIFICADOR DE CONTEUDO DO ARQUIVO
echo ==========================================================
echo.
if not exist "%VENDAS%" (
    echo [AVISO] vendas.js nao encontrado em sistema-cadastro-clientes\vendas.js
    echo.
    pause
    exit /b 1
)
echo Verificando Foco Automatico...
findstr /C:"barcodeInput.focus()" "%VENDAS%" >nul
set focus_ok=%errorlevel%

echo Verificando Estilos Termicos (80mm)...
findstr /C:"width: 72mm" "%VENDAS%" >nul
set thermal_ok=%errorlevel%

if %focus_ok% equ 0 if %thermal_ok% equ 0 (
    echo.
    echo [SUCESSO] Todas as alteracoes de PDV e Impressao estao salvas no disco.
) else (
    echo.
    echo [FALHA] Algumas alteracoes nao foram encontradas. Verifique se salvou o arquivo vendas.js.
)
echo.
pause
