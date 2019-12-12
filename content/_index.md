---
title: JuliaGPU
---

<br />

<div class="text-justify">

JuliaGPU is a Github organization created to unify the many packages for
programming GPUs in Julia. With its high-level syntax and flexible compiler,
Julia is well positioned to productively program hardware accelerators like GPUs
without sacrificing performance.

Several GPU platforms are supported, but there are large differences in features
and stability. On this website, you can find a brief introduction of the
supported platforms and links to the respective home pages.

</div>


<div class="text-left">

## Supported platforms

The best supported GPU platform in Julia is **[NVIDIA CUDA](/nvidia/)**, with
mature and full-featured packages for both low-level kernel programming as well
as working with high-level operations on arrays. All versions of Julia are
supported, and the functionality is actively used by a variety of applications
and libraries.

Experimental support exists for **[AMD GPUs](amd)** running on the ROCm stack.
These GPUs can similarly be programmed in Julia at the kernel level or using
array operations, but these capabilities are under heavy development and are not
ready for general consumption yet.

Lastly, there is limited support for programming GPUs with **[OpenCL](opencl)**.
It is possible to interface with such GPUs to execute kernels written in OpenCL
C, but the native programming capabilities are not supported on recent versions
of Julia anymore.


## Community

If you need help, or have questions about GPU programming in Julia, you can find members of
the community at:

- Julia Discourse, with a dedicated [GPU
  section](https://discourse.julialang.org/c/domain/gpu/11)
- Julia Slack ([register here](https://slackinvite.julialang.org/)), on the [#gpu
  channel](https://julialang.slack.com/messages/C689Y34LE/)

</div>
