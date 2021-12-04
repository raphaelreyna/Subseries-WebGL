FROM nginx:1.21.4
COPY dist /usr/share/nginx/html/dist
COPY glsl /usr/share/nginx/html/glsl
COPY js /usr/share/nginx/html/js
COPY index.css /usr/share/nginx/html/index.css
COPY index.html /usr/share/nginx/html/index.html
