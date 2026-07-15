import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../shared/ui/dialog';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Textarea } from '../../../shared/ui/textarea';
import { useCreateArtistMutation } from './hooks';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface CreateArtistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateArtistFormValues {
  displayName: string;
  slug: string;
  bio: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export function CreateArtistDialog({ open, onOpenChange }: CreateArtistDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateArtistFormValues>({
    defaultValues: { displayName: '', slug: '', bio: '', status: 'ACTIVE' },
  });
  const status = watch('status');
  const createMutation = useCreateArtistMutation();

  const onSubmit = (data: CreateArtistFormValues) => {
    createMutation.mutate(
      {
        slug: data.slug,
        displayName: data.displayName,
        ...(data.bio ? { bio: data.bio } : {}),
        status: data.status,
      },
      {
        onSuccess: () => {
          toast.success('Đã tạo nghệ sĩ');
          reset();
          onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.message || 'Tạo nghệ sĩ thất bại'),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm nghệ sĩ</DialogTitle>
          <DialogDescription>Tạo hồ sơ nghệ sĩ mới trong danh mục.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="create-artist-display-name"
            label="Tên hiển thị"
            placeholder="Nhập tên hiển thị nghệ sĩ..."
            error={errors.displayName?.message}
            {...register('displayName', { required: 'Tên hiển thị không được để trống' })}
          />
          <Input
            id="create-artist-slug"
            label="Đường dẫn URL (Slug)"
            placeholder="vi-du-nghe-si"
            error={errors.slug?.message}
            {...register('slug', {
              required: 'Slug không được để trống',
              pattern: {
                value: SLUG_PATTERN,
                message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang',
              },
            })}
          />
          <Textarea
            id="create-artist-bio"
            label="Tiểu sử (không bắt buộc)"
            rows={3}
            {...register('bio')}
          />
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="create-artist-status">
              Trạng thái
            </label>
            <select
              id="create-artist-status"
              value={status}
              onChange={(e) => setValue('status', e.target.value as 'ACTIVE' | 'INACTIVE')}
              className="w-full h-10 rounded-lg border border-white/10 bg-surface-container px-3 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Tạo nghệ sĩ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
