#syntax=docker/dockerfile:1

FROM python:3.11.1-slim-bullseye
WORKDIR /app
COPY requirements.txt requirements.txt
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y default-libmysqlclient-dev
RUN pip3 install -r requirements.txt

RUN useradd --no-create-home --shell /bin/false appuser

COPY cron.py .
RUN chown -R appuser:appuser .

USER appuser
CMD ["tail", "-f", "/dev/null"]
