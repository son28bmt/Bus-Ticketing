import type { ReactNode } from 'react';

type ModalConfirmProps = {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ModalConfirm = ({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ModalConfirmProps) => {
  return (
    <div className="modal-confirm">
      <div className="modal-confirm__content">
        <h3>{title}</h3>
        {description && <div className="modal-confirm__description">{description}</div>}
        <div className="modal-confirm__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="btn btn--primary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirm;
