FROM --platform=linux/arm64 public.ecr.aws/amazonlinux/amazonlinux:2023 AS base

# Copy function code
#COPY app.py ${LAMBDA_TASK_ROOT}
RUN dnf groupinstall -y "Development Tools"
RUN dnf install -y python-devel libpng-devel freetype-devel gcc-c++
RUN dnf install -y libxml2 libxslt
RUN dnf install -y python3.11 python3.11-devel python3.11-setuptools

# USING THIS: https://gist.github.com/allen-munsch/ad8faf9c04b72aa8d0808fa8953bc639
# https://github.com/JFox/aws-lambda-lxml
#https://stackoverflow.com/questions/53406638/importerror-cannot-import-name-etree-on-python-3-6

RUN python3.11  -m venv lxml-venv
# RUN STATIC_DEPS=true ./lxml-venv/bin/pip install lxml
RUN mkdir python
RUN STATIC_DEPS=true ./lxml-venv/bin/pip install \
    --platform manylinux2014_aarch64 \
    --target ./lxml-venv/lib/python3.11/site-packages \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: --upgrade \
    lxml 
RUN ./lxml-venv/bin/pip install python-docx 


#RUN ./lxml-venv/bin/pip install lxml -t ./python

RUN cp -a ./lxml-venv/lib ./python
RUN cp -a ./lxml-venv/lib64 ./python

RUN zip -r9 ./layer311.zip python
#COPY --from=build-stage /go/bin/vndr /
# COPY ./layer311.zip /

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
#CMD [ "app.handler" ]
# RUN echo "hello world"


# RUN cp -a ./v-env/lib/python3.11/site-packages/. ./python

