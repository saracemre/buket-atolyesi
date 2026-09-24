#!/bin/bash
# Buket Atölyesi'ni yerel sunucuda başlatır (Mac'te çift tıklayarak çalıştırılabilir)
cd "$(dirname "$0")"
PORT=8080
(sleep 1 && open "http://localhost:$PORT") &
python3 sunucu.py $PORT
