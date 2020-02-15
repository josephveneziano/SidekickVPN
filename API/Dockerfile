FROM python:3.6-alpine

WORKDIR /usr/app

COPY ./requirements.txt .

RUN pip3 install -r requirements.txt

RUN pip3 install --pre scapy

COPY ./* ./

CMD ["/bin/sh", "./run.sh"]
# CMD ["/bin/sh"]

