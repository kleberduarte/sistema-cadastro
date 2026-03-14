@echo off
echo ==========================================================
echo   VERIFICADOR DE CONTEUDO DO ARQUIVO
echo ==========================================================
echo.
echo Verificando Foco Automatico...
findstr /C:"barcodeInput.focus()" "c:\Users\klebe\Desktop\sistema-cadastro-clientes\vendas.js" >nul
set focus_ok=%errorlevel%

echo Verificando Estilos Termicos (80mm)...
findstr /C:"width: 72mm" "c:\Users\klebe\Desktop\sistema-cadastro-clientes\vendas.js" >nul
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