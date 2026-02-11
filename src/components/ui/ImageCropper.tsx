'use client'

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Upload, X, Check, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropperProps {
  onImageCropped: (croppedImageUrl: string, file: File) => void
  aspectRatio?: number
  circularCrop?: boolean
  maxWidth?: number
  maxHeight?: number
  maxFileSizeMB?: number
}

export interface ImageCropperRef {
  triggerCrop: () => Promise<File | null>
  hasPendingImage: () => boolean
}

const MAX_FILE_SIZE_MB = 800 // 800MB limit

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

const ImageCropper = forwardRef<ImageCropperRef, ImageCropperProps>(({
  onImageCropped,
  aspectRatio = 1,
  circularCrop = true,
  maxWidth = 400,
  maxHeight = 400,
  maxFileSizeMB = MAX_FILE_SIZE_MB,
}, ref) => {
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > maxFileSizeMB) {
        setError(`הקובץ גדול מדי. הגודל המקסימלי הוא ${maxFileSizeMB}MB`)
        if (inputRef.current) {
          inputRef.current.value = ''
        }
        return
      }

      setError(null)
      setCrop(undefined)
      setScale(1)
      const reader = new FileReader()
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      )
      reader.readAsDataURL(file)
    }
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, aspectRatio))
  }, [aspectRatio])

  // Recenter crop when scale changes
  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
    // Reset crop to center with new scale
    if (imgRef.current) {
      const { width, height } = imgRef.current
      setCrop(centerAspectCrop(width, height, aspectRatio))
    }
  }, [aspectRatio])

  const getCroppedImg = useCallback(async (): Promise<File | null> => {
    const image = imgRef.current
    const previewCanvas = previewCanvasRef.current
    if (!completedCrop || !image || !previewCanvas) {
      return null
    }

    // Account for both the display scale (naturalWidth/width) and the zoom scale (transform)
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    // completedCrop is in transformed coordinates, adjust for zoom scale first, then display scale
    const cropWidth = (completedCrop.width / scale) * scaleX
    const cropHeight = (completedCrop.height / scale) * scaleY
    const cropX = (completedCrop.x / scale) * scaleX
    const cropY = (completedCrop.y / scale) * scaleY

    const canvas = new OffscreenCanvas(cropWidth, cropHeight)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('No 2d context')
    }

    // Draw the cropped portion
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    )

    // If circular crop, apply mask
    if (circularCrop) {
      const maskCenterX = cropWidth / 2
      const maskCenterY = cropHeight / 2
      const radius = Math.min(maskCenterX, maskCenterY)

      // Use destination-in to keep only the circular part
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      ctx.arc(maskCenterX, maskCenterY, radius, 0, 2 * Math.PI)
      ctx.closePath()
      ctx.fillStyle = '#000000'
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    // Resize if needed
    let finalWidth = cropWidth
    let finalHeight = cropHeight

    if (finalWidth > maxWidth || finalHeight > maxHeight) {
      const ratio = Math.min(maxWidth / finalWidth, maxHeight / finalHeight)
      finalWidth = finalWidth * ratio
      finalHeight = finalHeight * ratio
    }

    const resizedCanvas = new OffscreenCanvas(finalWidth, finalHeight)
    const resizedCtx = resizedCanvas.getContext('2d')
    if (!resizedCtx) {
      throw new Error('No 2d context')
    }

    // Draw the resized image (already has circular mask if needed)
    resizedCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight)

    const blob = await resizedCanvas.convertToBlob({
      type: 'image/png',
      quality: 0.95,
    })

    const file = new File([blob], 'logo.png', { type: 'image/png' })
    const url = URL.createObjectURL(blob)

    onImageCropped(url, file)
    setImgSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
    setScale(1)

    return file
  }, [completedCrop, maxWidth, maxHeight, onImageCropped, circularCrop, scale])

  const handleReset = () => {
    setImgSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
    setScale(1)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    triggerCrop: getCroppedImg,
    hasPendingImage: () => !!imgSrc && !!completedCrop,
  }), [getCroppedImg, imgSrc, completedCrop])

  return (
    <div className="w-full">
      {!imgSrc ? (
        <div>
          <div
            onClick={() => inputRef.current?.click()}
            className="relative border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-green-500/50 hover:bg-green-500/5 transition-all group"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={onSelectFile}
              className="hidden"
            />
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-all">
              <Upload size={28} className="text-green-500" />
            </div>
            <p className="text-foreground-muted mb-1">לחץ להעלאת לוגו</p>
            <p className="text-foreground-muted/60 text-sm">PNG, JPG עד {maxFileSizeMB}MB</p>
          </div>
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Crop Area */}
          <div className="relative bg-black/50 rounded-xl overflow-hidden flex items-center justify-center p-4">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              circularCrop={circularCrop}
              className="max-h-[300px]"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                style={{
                  maxHeight: '300px',
                  width: 'auto',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleScaleChange(Math.max(0.5, scale - 0.1))}
              className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-all flex items-center justify-center"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-foreground-muted text-sm min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleScaleChange(Math.min(3, scale + 0.1))}
              className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-all flex items-center justify-center"
            >
              <ZoomIn size={18} />
            </button>
          </div>


          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground-muted hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <X size={18} />
              <span>ביטול</span>
            </button>
            <button
              type="button"
              onClick={getCroppedImg}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} />
              <span>אשר חיתוך</span>
            </button>
          </div>

          {/* Hidden canvas for preview */}
          <canvas
            ref={previewCanvasRef}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  )
})

ImageCropper.displayName = 'ImageCropper'

export default ImageCropper
