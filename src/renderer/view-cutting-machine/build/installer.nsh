; Script NSIS customizado para corrigir ícone do atalho da área de trabalho

!macro customInstall
  ; Remove atalho padrão se existir
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  ; Cria novo atalho com ícone correto
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" \
    "$INSTDIR\${PRODUCT_FILENAME}.exe" \
    "" \
    "$INSTDIR\resources\build\view-cutting-machine.ico" \
    0 \
    SW_SHOWNORMAL \
    "" \
    "Iniciar ${PRODUCT_NAME}"
!macroend

!macro customUnInstall
  ; Remove atalho ao desinstalar
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
!macroend
