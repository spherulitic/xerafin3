#syntax=docker/dockerfile:1

FROM python:3.11.1-slim-bullseye
WORKDIR /app
COPY requirements.txt requirements.txt
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y default-libmysqlclient-dev
RUN pip3 install -r requirements.txt

RUN useradd -u 1001 --no-create-home --shell /bin/false appuser
RUN mkdir /app/temp-data
RUN chown appuser /app/temp-data
RUN chgrp appuser /app/temp-data
COPY . .

USER appuser

CMD [ "gunicorn", "--bind", "0.0.0.0:5000", "cardbox:app" ]
