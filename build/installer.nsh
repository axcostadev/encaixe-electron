!macro customInstall
  ; Remove default desktop shortcut if exists
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

  ; Create new desktop shortcut with correct icon
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
  ; Remove desktop shortcut on uninstall
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
!macroend
