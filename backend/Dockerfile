FROM --platform=amd64 raphaelreyna/graphqld:latest
RUN apt update && apt install -y python3-pip
RUN pip3 install sympy
COPY src /graphqld
RUN mv /graphqld/graphqld.yaml /etc/graphqld.yaml