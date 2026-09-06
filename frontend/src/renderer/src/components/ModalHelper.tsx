import React, { useState } from 'react'
import { CloseIcon, CheckIcon } from './Icons'
import helper1Video from '../assets/HelperImages/helper1.mp4'
import helper2Image from '../assets/HelperImages/hellper2.png'
import bannerImage from '../assets/HelperImages/banner.png'

interface ModalHelperProps {
  isOpen: boolean
  onClose: () => void
}

const HELPER_MODAL_STORAGE_KEY = 'gbl_has_seen_helper_modal'

export const ModalHelper: React.FC<ModalHelperProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(true)

  if (!isOpen) return null

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(HELPER_MODAL_STORAGE_KEY, 'true')
    }
    onClose()
  }

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleClose()
    }
  }

  const steps = [
    {
      title: 'Te damos la bienvenida a HASHI',
      heading: 'Tu lanzador de juegos personal',
      description: 'Organiza y ejecuta todos tus juegos de PC, Steam y aplicaciones desde un solo lugar.',
      media: (
        <video
          src={helper1Video}
          autoPlay
          loop
          muted
          playsInline
          className="modal-helper-media-element"
        />
      )
    },
    {
      title: 'Te damos la bienvenida a HASHI',
      heading: 'Personalizalo todo!',
      description: 'Desde portadas hasta fondos, cada detalle está en tus manos.',
      media: (
        <img
          src={helper2Image}
          alt="Personalización"
          className="modal-helper-media-element"
          draggable={false}
        />
      )
    },
    {
      title: 'Te damos la bienvenida a HASHI',
      heading: 'Todo listo para comenzar',
      description: 'Disfruta de tu biblioteca personalizada con soporte para mando, efectos de sonido e interfaz inmersiva.',
      media: (
        <div className="modal-helper-banner-wrapper">
          <img
            src={bannerImage}
            alt="Banner"
            className="modal-helper-media-element"
            draggable={false}
          />
          <div className="modal-helper-banner-overlay">
            <h1 className="modal-helper-welcome-text">Bienvenido</h1>
            <h3 className="modal-helper-Subtitle-text">by Hashi</h3>
          </div>
        </div>
      )
    }
  ]

  const activeStepData = steps[currentStep]

  return (
    <div className="modal-overlay modal-helper-overlay" onClick={handleClose}>
      <div className="modal modal-helper-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-helper-header">
          <span className="modal-helper-header-title">{activeStepData.title}</span>
          <button className="modal-close modal-helper-close" onClick={handleClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Media Box */}
        <div className="modal-helper-media-box">
          {activeStepData.media}
        </div>

        {/* Text Section */}
        <div className="modal-helper-text-section">
          <h3 className="modal-helper-heading">{activeStepData.heading}</h3>
          <p className="modal-helper-description">{activeStepData.description}</p>
        </div>

        {/* Footer */}
        <div className="modal-helper-footer">
          <label className="modal-helper-checkbox-label">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="modal-helper-checkbox-input"
            />
            <span className="modal-helper-custom-checkbox">
              {dontShowAgain && <CheckIcon size={12} />}
            </span>
            <span>No mostrar de nuevo</span>
          </label>

          <div className="modal-helper-indicators">
            {steps.map((_, idx) => (
              <button
                key={idx}
                className={`modal-helper-indicator-bar ${idx === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Página ${idx + 1}`}
              />
            ))}
          </div>

          <button className="btn-primary modal-helper-next-btn" onClick={handleNext}>
            {currentStep === 2 ? 'Comenzar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
