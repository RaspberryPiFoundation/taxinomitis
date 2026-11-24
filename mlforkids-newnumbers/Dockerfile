FROM python:3.11

RUN apt update
RUN apt install fonts-liberation -qqy
RUN apt install graphviz -qqy

RUN pip install --upgrade pip

RUN adduser mlforkids
USER mlforkids
WORKDIR /home/mlforkids

COPY --chown=mlforkids:mlforkids requirements.txt requirements.txt
RUN pip install --user --no-cache-dir -r requirements.txt

COPY --chown=mlforkids:mlforkids app app

ENV MPLBACKEND svg
ENV MODELS_CACHE_SIZE 100
ENV MODE production
ENV OPENAPI_URL ""

# listen on the port given in $PORT where the platform assigns one (such as Heroku), otherwise 8000
CMD ["sh", "-c", "exec /home/mlforkids/.local/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
