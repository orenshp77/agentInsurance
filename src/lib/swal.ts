import Swal from 'sweetalert2'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#0f3460',
  color: '#e8e8e8',
})

export const showSuccess = (message: string) => {
  Toast.fire({
    icon: 'success',
    title: message,
  })
}

export const showError = (message: string) => {
  Toast.fire({
    icon: 'error',
    title: message,
  })
}

export const showWarning = (message: string) => {
  Toast.fire({
    icon: 'warning',
    title: message,
  })
}

export const showConfirm = async (
  title: string,
  text: string,
  confirmText = 'אישור',
  cancelText = 'ביטול'
) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#fbbf24',
    cancelButtonColor: '#ef4444',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    background: '#0f3460',
    color: '#e8e8e8',
  })
  return result.isConfirmed
}

export const showInput = async (
  title: string,
  inputLabel: string,
  inputPlaceholder: string
) => {
  const result = await Swal.fire({
    title,
    input: 'text',
    inputLabel,
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonColor: '#fbbf24',
    cancelButtonColor: '#ef4444',
    confirmButtonText: 'אישור',
    cancelButtonText: 'ביטול',
    background: '#0f3460',
    color: '#e8e8e8',
  })
  return result.value
}

export default Swal
