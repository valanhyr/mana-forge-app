import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Button from './Button';
import { AVATAR_OPTIONS, getAvatarUrl } from '../../core/utils/avatar';

interface AvatarPickerModalProps {
  isOpen: boolean;
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
  onClose: () => void;
  onApply: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function AvatarPickerModal({
  isOpen,
  selectedAvatar,
  onSelect,
  onClose,
  onApply,
  t,
}: AvatarPickerModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby="avatar-picker-description"
          className="fixed inset-0 z-[221] h-full w-full bg-zinc-900 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 sm:px-6">
            <div>
              <Dialog.Title className="text-lg font-bold text-white">
                {t('profile.avatarModalTitle')}
              </Dialog.Title>
              <Dialog.Description
                id="avatar-picker-description"
                className="text-sm text-zinc-400 mt-1"
              >
                {t('profile.avatarDescription')}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
              aria-label={t('common.cancel')}
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="px-4 py-4 sm:px-6 border-b border-zinc-800">
            <div className="flex items-center gap-4 rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-500/40 shadow-inner shrink-0">
                <img
                  src={getAvatarUrl(selectedAvatar)}
                  alt={t('profile.avatarSelected')}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t('profile.avatarSelected')}</p>
                <p className="text-xs text-zinc-500 mt-1">{selectedAvatar}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
              {AVATAR_OPTIONS.map((avatar, index) => {
                const isSelected = avatar === selectedAvatar;
                return (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => onSelect(avatar)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/30'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                    aria-label={t('profile.avatarOptionAlt', {
                      number: index + 1,
                    })}
                    aria-pressed={isSelected}
                  >
                    <img
                      src={getAvatarUrl(avatar)}
                      alt={t('profile.avatarOptionAlt', {
                        number: index + 1,
                      })}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <span className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <span className="bg-brand-500 text-white text-xs font-bold rounded-full px-2 py-1">
                          {t('profile.selected')}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-800 px-4 py-4 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onApply}>{t('profile.applyAvatar')}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
