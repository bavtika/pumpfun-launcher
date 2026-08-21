# RunPod serverless GPU worker for Solana vanity address generation.
# Uses SolVanityCL (OpenCL) — supports both prefix and suffix matching.
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    ocl-icd-libopencl1 clinfo \
    python3 python3-pip \
    git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# NVIDIA OpenCL ICD (driver is injected by the nvidia container runtime)
RUN mkdir -p /etc/OpenCL/vendors && \
    echo "libnvidia-opencl.so.1" > /etc/OpenCL/vendors/nvidia.icd

WORKDIR /app
RUN git clone --depth 1 https://github.com/WincerChan/SolVanityCL.git /app/solvanity \
 && pip3 install --break-system-packages -r /app/solvanity/requirements.txt runpod

COPY handler.py /app/handler.py

ENV NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    LANG=C.UTF-8

CMD ["python3", "-u", "/app/handler.py"]
