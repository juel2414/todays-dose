#!/bin/sh
# 배포 전에 실행: index.html의 style.css / app.js 주소에 새 버전 번호를 붙여
# 브라우저가 예전 파일(캐시)을 쓰지 않고 새 파일을 받게 한다.
cd "$(dirname "$0")/.." || exit 1
v=$(date +%Y%m%d%H%M%S)
sed -i '' -E "s#(style\.css)(\?v=[0-9]+)?\"#\1?v=$v\"#; s#(app\.js)(\?v=[0-9]+)?\"#\1?v=$v\"#" index.html
echo "version $v"
