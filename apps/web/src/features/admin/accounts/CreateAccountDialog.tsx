import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../shared/ui/dialog';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { useCreateAccount } from './hooks';
import { toast } from 'sonner';
import type { UserRole } from './api';

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateAccountFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  role: UserRole;
}

export const CreateAccountDialog = ({ open, onOpenChange }: CreateAccountDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateAccountFormValues>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      role: 'CHECKIN_STAFF',
    }
  });
  const role = watch('role');

  const { mutate, isPending } = useCreateAccount();

  const onSubmit = (data: CreateAccountFormValues) => {
    const payload = {
      email: data.email,
      passwordRaw: data.password,
      displayName: data.displayName,
      roles: [data.role],
    };
    mutate(payload, {

      onSuccess: () => {
        toast.success('Account created successfully');
        reset();
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'An error occurred');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) reset();
    }}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Account</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new account and grant system access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Display Name</label>
            <Input
              {...register('displayName', { required: 'Name is required' })}
              className="bg-slate-800/50 border-white/10 text-white placeholder:placeholder:text-slate-500"
              placeholder="Enter display name..."
            />
            {errors.displayName && <span className="text-red-400 text-xs">{errors.displayName.message}</span>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Email</label>
            <Input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="bg-slate-800/50 border-white/10 text-white placeholder:placeholder:text-slate-500"
              placeholder="Enter email address..."
            />
            {errors.email && <span className="text-red-400 text-xs">{errors.email.message}</span>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Password</label>
            <Input
              type="password"
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
              className="bg-slate-800/50 border-white/10 text-white placeholder:placeholder:text-slate-500"
              placeholder="Enter password..."
            />
            {errors.password && <span className="text-red-400 text-xs">{errors.password.message}</span>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Confirm Password</label>
            <Input
              type="password"
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: (value) => value === watch('password') || 'Passwords do not match'
              })}
              className="bg-slate-800/50 border-white/10 text-white placeholder:placeholder:text-slate-500"
              placeholder="Re-enter password..."
            />
            {errors.confirmPassword && <span className="text-red-400 text-xs">{errors.confirmPassword.message}</span>}
          </div>

          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setValue('role', e.target.value as UserRole)}
                className="appearance-none cursor-pointer w-full bg-slate-800/50 border border-white/10 rounded-md py-2 pl-3 pr-8 text-sm text-white transition-all focus:border-[#4cd7f6] focus:outline-none focus:ring-1 focus:ring-[#4cd7f6]/50"
              >
                <option value="" disabled>Select role</option>
                <option value="ADMIN">Admin</option>
                <option value="ORGANIZER">Organizer</option>
                <option value="CHECKIN_STAFF">Staff</option>
                <option value="AUDIENCE">Audience</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">
                ▼
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
