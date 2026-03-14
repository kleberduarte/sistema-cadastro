@echo off
echo ==========================================================
echo   VERIFICADOR DE CONTEUDO DO ARQUIVO
echo ==========================================================
echo.
echo Verificando se a alteracao do cursor esta salva em vendas.js...
echo.
findstr /C:"barcodeInput.focus()" "c:\Users\klebe\Desktop\sistema-cadastro-clientes\vendas.js"
if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] A alteracao foi encontrada no arquivo no disco.
) else (
    echo.
    echo [FALHA] A alteracao NAO foi encontrada no arquivo no disco.
    echo ^^> CAUSA PROVAVEL: O arquivo 'vendas.js' nao foi salvo. Por favor, abra-o, salve ^(Ctrl+S^) e tente o script 'atualizar_projeto.bat' novamente.
)
echo.
pause