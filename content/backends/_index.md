+++
title = "Back-ends"
description = "Julia supports GPUs from all major vendors, each through its own package."
+++

Each back-end implements the same array abstractions, so most generic Julia
code runs unmodified on any of them. To write portable kernels, use
[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl);
for portable high-performance algorithms like sorting and scans, see
[AcceleratedKernels.jl](https://github.com/JuliaGPU/AcceleratedKernels.jl).
