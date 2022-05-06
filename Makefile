PROJECT_NAME=`basename $(CURDIR)`
IMAGE_NAME=ghcr.io/arig-robotique/$(PROJECT_NAME)
IMAGE_VERSION=local

ALL=dist node_modules

SSH_CONFIG=-v $SSH_AUTH_SOCK:/ssh-agent -e SSH_AUTH_SOCK=/ssh-agent

build:
	docker build -t $(IMAGE_NAME):$(IMAGE_VERSION) .

debug:
	docker run -it --rm $(SSH_CONFIG) $(IMAGE_NAME):$(IMAGE_VERSION) sh

run:
	docker run -it --rm -p 0:80 $(SSH_CONFIG) $(IMAGE_NAME):$(IMAGE_VERSION)

clean:
	rm -Rf $(ALL)
