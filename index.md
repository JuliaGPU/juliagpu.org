+++
title = "JuliaGPU"
hascode = true
+++

~~~
<div class="hero">
  <div class="container">
    <h1>
      <img height=70 src="/assets/logo_crop.png" alt="JuliaGPU">
      JuliaGPU
    </h1>
    <p class="lead">
      High-performance GPU programming in a high-level language.
    </p>
    <div class="hero-code">
      <pre><code class="language-julia">using CUDA

A = CUDA.randn(1024, 1024)
B = CUDA.randn(1024, 1024)
C = A * B  # runs on the GPU</code></pre>
    </div>
  </div>
</div>
~~~

JuliaGPU is a Github organization created to unify the many packages for
programming GPUs in Julia. With its high-level syntax and flexible compiler,
Julia is well positioned to **productively program hardware accelerators
without sacrificing performance**.

Many applications and libraries in the Julia ecosystem rely on GPU support, and
the number is growing rapidly. Head over to the [showcases](/showcases/) page
if you want to see some examples of how Julia's GPU support is used in practice.


## Platform comparison

~~~
<div class="table-responsive">
<table class="backend-table">
  <thead>
    <tr>
      <th>Platform</th>
      <th>Package</th>
      <th>Maturity</th>
      <th>Array Type</th>
      <th>Kernel Macro</th>
      <th>Vendor Libraries</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/backends/cuda/">NVIDIA CUDA</a></td>
      <td><a href="https://github.com/JuliaGPU/CUDA.jl">CUDA.jl</a></td>
      <td><span class="badge badge-mature">Mature</span></td>
      <td><code>CuArray</code></td>
      <td><code>@cuda</code></td>
      <td>cuBLAS, cuFFT, cuDNN, cuSOLVER, cuSPARSE, cuTENSOR</td>
    </tr>
    <tr>
      <td><a href="/backends/rocm/">AMD ROCm</a></td>
      <td><a href="https://github.com/JuliaGPU/AMDGPU.jl">AMDGPU.jl</a></td>
      <td><span class="badge badge-stable">Stable</span></td>
      <td><code>ROCArray</code></td>
      <td><code>@roc</code></td>
      <td>rocBLAS, rocFFT, rocSOLVER, rocSPARSE</td>
    </tr>
    <tr>
      <td><a href="/backends/oneapi/">Intel oneAPI</a></td>
      <td><a href="https://github.com/JuliaGPU/oneAPI.jl">oneAPI.jl</a></td>
      <td><span class="badge badge-developing">Developing</span></td>
      <td><code>oneArray</code></td>
      <td><code>@oneapi</code></td>
      <td>oneMKL (partial)</td>
    </tr>
    <tr>
      <td><a href="/backends/metal/">Apple Metal</a></td>
      <td><a href="https://github.com/JuliaGPU/Metal.jl">Metal.jl</a></td>
      <td><span class="badge badge-stable">Stable</span></td>
      <td><code>MtlArray</code></td>
      <td><code>@metal</code></td>
      <td>MPS (partial)</td>
    </tr>
    <tr>
      <td><a href="/backends/opencl/">OpenCL</a></td>
      <td><a href="https://github.com/JuliaGPU/OpenCL.jl">OpenCL.jl</a></td>
      <td><span class="badge badge-early">Pre-release</span></td>
      <td><code>CLArray</code></td>
      <td><code>@opencl</code></td>
      <td>&mdash;</td>
    </tr>
  </tbody>
</table>
</div>
~~~


## Supported platforms

The best supported GPU platform in Julia is [**NVIDIA CUDA**](/backends/cuda/)
through CUDA.jl. It provides **kernel programming support comparable to CUDA
C**, along with comprehensive integration with vendor libraries including
cuBLAS, cuFFT, cuSOLVER, cuSPARSE, cuDNN, cuTENSOR, and more. CUDA.jl also
features seamless integration with development tools like Nsight and CUPTI, and
supports a wide range of CUDA toolkit versions with automatic installation
through JLLs. It works reliably on both Linux and Windows across all Julia
versions and enjoys widespread adoption throughout the ecosystem.

AMDGPU.jl offers similar capabilities for [**AMD GPUs**](/backends/rocm/)
running on the ROCm stack. While somewhat less developed than CUDA.jl, it
provides solid integration with key vendor libraries such as rocBLAS, rocFFT,
rocSOLVER, and rocSPARSE. The package can be slightly more challenging to
install and configure due to how ROCm is distributed, but it has been
successfully used in various applications and libraries.

For Intel hardware, oneAPI.jl delivers newer but growing support for [**Intel
GPUs with oneAPI**](/backends/oneapi/). The package offers robust kernel
programming capabilities but currently has limited high-level array operations
and only integrates partially with oneMKL. For developers working with Intel
GPUs, it provides the core functionality needed while the ecosystem continues to
mature.

Metal.jl provides similar support for [**Apple Silicon GPUs**](/backends/metal/)
with capabilities for both kernel programming and array operations. While
offering more limited vendor library integration compared to other back-ends,
Metal.jl has evolved beyond its previous experimental status to become a stable
solution for Apple GPU programming in Julia.

Finally, work is under way to revive the [**OpenCL**](/backends/opencl/) back-end
for use on other platforms, as well as to support executing GPU code on CPUs.
The OpenCL.jl package is currently in a pre-release state and is not yet
recommended for production use.

## Publications

Much of Julia's GPU support was developed as part of academic research. If you would like
to help support it, please star the relevant repositories as such metrics may help us secure
funding in the future. If you use our software as part of your research, teaching, or other
activities, we would be grateful if you could cite our work:

- T. Besard, C. Foket, and B. De Sutter. "[Effective extensible programming:
  Unleashing Julia on
  GPUs.](https://ieeexplore.ieee.org/abstract/document/8471188)" *IEEE
  Transactions on Parallel and Distributed Systems* (2018).
- T. Besard, V. Churavy, Alan Edelman and B. De Sutter. "[Rapid software
  prototyping for heterogeneous and distributed
  platforms.](https://www.sciencedirect.com/science/article/pii/S0965997818310123)"
  *Advances in Engineering Software* (2019).
- T. Faingnaert, T. Besard, and B. De Sutter. "[Flexible Performant GEMM Kernels
  on GPUs.](https://ieeexplore.ieee.org/document/9655458)" *IEEE Transactions on
  Parallel and Distributed Systems* (2021).

## Community

If you need help, or have questions about GPU programming in Julia, you can find
members of the community at:

- Julia Discourse, with a dedicated [GPU
  section](https://discourse.julialang.org/c/domain/gpu/11)
- Julia Slack ([register here](https://slackinvite.julialang.org/)), on the
  [#gpu channel](https://julialang.slack.com/messages/C689Y34LE/)
- [JuliaGPU office hours](https://meet.google.com/hmv-zqvp-tbf), every other
  week at 2PM CET \
  (check the [Julia community calendar](https://julialang.org/community/#events)
  for more details).
