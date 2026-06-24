import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from './alert-dialog';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm: () => void;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = 'Hủy',
  confirmText = 'Xác nhận',
  onConfirm,
  confirmVariant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const isDestructive = confirmVariant === 'destructive';
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#0f172a] border-slate-800 text-slate-200 shadow-2xl p-0 gap-0 rounded-2xl overflow-hidden sm:max-w-[420px]">
        <div className="p-6">
          <AlertDialogHeader className="gap-4 flex-row items-start space-y-0 text-left">
            <AlertDialogMedia className={`shrink-0 flex items-center justify-center size-10 rounded-full border ${isDestructive ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
              {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
            </AlertDialogMedia>
            <div className="flex flex-col gap-1.5 pt-1">
              <AlertDialogTitle className="font-display text-lg font-semibold tracking-tight text-white leading-none">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-slate-400">
                {description}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
        </div>
        
        <AlertDialogFooter className="m-0 bg-[#020617]/50 border-t border-slate-800 px-6 py-5 flex sm:justify-end gap-3 rounded-b-2xl">
          <AlertDialogCancel
            disabled={isLoading}
            className="h-9 px-4 text-sm font-medium border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); 
              onConfirm();
              onOpenChange(false);
            }}
            loading={isLoading}
            className={
              isDestructive
                ? 'h-9 px-4 text-sm font-semibold bg-red-600/90 text-white hover:bg-red-600 border border-red-600 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                : 'h-9 px-4 text-sm font-semibold bg-indigo-600/90 text-white hover:bg-indigo-600 border border-indigo-600 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.2)]'
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
