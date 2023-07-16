FROM python:3.11.4-alpine3.18


WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY . .

RUN apk add --no-cache tzdata
ENV TZ=Europe/Zurich

CMD python3 app.py
