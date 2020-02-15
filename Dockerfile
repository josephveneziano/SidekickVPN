FROM node:10.15.1-alpine

WORKDIR /usr/app

RUN apk update

#RUN apk search wireguard-tools
#RUN apk fetch wireguard-tools
#RUN ls
RUN apk add -U bash make gcc libc-dev git iptables ip6tables linux-headers gettext --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ --allow-untrusted
RUN git clone https://git.zx2c4.com/wireguard-tools.git && \
cd wireguard-tools/src/ && \
make && make install

RUN wg
#RUN curl -sf  -o /usr/app/wireguard-tools-1.0.20200206.tar.xz  -L  https://git.zx2c4.com/wireguard-tools/snapshot/wireguard-tools-1.0.20200206.tar.xz && tar xf wireguard-tools-1.0.20200206.tar.xz
#RUN ls wireguard-tools-1.0.20200206/src
#RUN apk add https://git.zx2c4.com/wireguard-tools/snapshot/wireguard-tools-1.0.20200206.tar.xz

# Backend
COPY node_server/package*.json ./
RUN npm install
RUN npm audit fix
COPY node_server ./

# Frontend
COPY frontend/package*.json ./frontend/
RUN npm --prefix ./frontend install
RUN npm --prefix ./frontend audit fix
COPY frontend frontend
RUN npm --prefix ./frontend run build
RUN mv ./frontend/build ./public

# User Addition CLI
COPY user-cli/package*.json ./user-cli/
RUN npm --prefix ./user-cli install
COPY ./user-cli ./user-cli
RUN npm --prefix ./user-cli link

# Config File and Startup script
COPY server_wg0.conf ./
COPY startup.sh ./

EXPOSE 51820/udp
EXPOSE 5000/tcp

CMD ["./startup.sh"]
