+++
title = "Other"
+++

# Other

Several other back-ends exist, not all of them with the same level of polish or
support as the NVIDIA and AMD back-ends.

## OpenCL

Support for OpenCL is available through the
[OpenCL.jl](https://github.com/JuliaGPU/OpenCL.jl) package, which is currently
undergoing a rewrite to enable native support for Julia.

## ArrayFire

ArrayFire is a general-purpose software library that targets CPUs, GPUs, and other
accelerator hardware. The
[ArrayFire.jl](https://github.com/JuliaGPU/ArrayFire.jl) package provides a
Julia interface to this library, and makes it possible to program accelerators
using an array abstraction built on the ArrayFire library.

## SX-Aurora

The [NEC SX-Aurora
Tsubasa](https://www.nec.com/en/global/solutions/hpc/sx/index.html) is a PCIe
card which works as a Vector Computer. It can be programmed from Julia using the
[VectorEngine.jl](https://github.com/sx-aurora-dev/VectorEngine.jl) package,
which at the moment requires a custom Julia build using a LLVM fork. Support is
expected to improve due NECs involement.
