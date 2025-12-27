#syntax=docker/dockerfile:1

FROM python:3.11.1-slim-bullseye
WORKDIR /app
COPY requirements.txt requirements.txt
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y default-libmysqlclient-dev
RUN pip3 install -r requirements.txt

RUN useradd --no-create-home --shell /bin/false appuser
#RUN mkdir -p /app/chatdata && chown -R appuser:appuser /app/chatdata

COPY . .

USER appuser

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "90", "--worker-class", "gevent", "--workers", "4", "chat:app"]
