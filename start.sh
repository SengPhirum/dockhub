docker build -t knetrahub:latest .
docker stack deploy -c docker-compose.yml knetrahub