target "default" {
  context = "containers"
  dockerfile = "Dockerfile.virt"
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}

target "networking" {
  context = "containers"
  dockerfile = "Dockerfile.networking"
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}

target "cli" {
  context = "cli"
  dockerfile = "Dockerfile"
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}
