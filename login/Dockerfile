#syntax=docker/dockerfile:1

FROM python:3.9-slim-bullseye
WORKDIR /app
COPY requirements.txt requirements.txt
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y default-libmysqlclient-dev
RUN pip3 install -r requirements.txt
COPY . .

ENV FLASK_APP=login

CMD [ "python3", "-m", "flask", "run", "--host=0.0.0.0"]
