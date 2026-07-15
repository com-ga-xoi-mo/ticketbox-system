import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiGet, apiPut } from '@/shared/api/client';
import { useQuery, useMutation } from '@tanstack/react-query';

const ALLOWED_BANKS = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB',
  'VPBank',
  'ACB',
  'Sacombank',
  'TPBank',
  'VIB',
  'HDBank',
  'SeABank',
  'MSB',
  'LienVietPostBank',
  'OCB',
  'Nam A Bank',
  'Eximbank',
];

interface BankProfilePayload {
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}

export function BankProfilePage() {
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me', 'bank-profile'],
    queryFn: async () => {
      const res = await apiGet<BankProfilePayload | null>('/me/bank-profile');
      return res;
    },
  });

  useEffect(() => {
    if (profile) {
      setBankAccountName(profile.bankAccountName || '');
      setBankAccountNumber(profile.bankAccountNumber || '');
      setBankName(profile.bankName || '');
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async (data: BankProfilePayload) => {
      const res = await apiPut<BankProfilePayload>('/me/bank-profile', data);
      return res;
    },
    onSuccess: () => {
      toast.success('Cập nhật tài khoản nhận tiền thành công');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Có lỗi xảy ra');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountName || !bankAccountNumber || !bankName) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    mutation.mutate({ bankAccountName, bankAccountNumber, bankName });
  };

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Tài khoản nhận tiền</CardTitle>
          <CardDescription>
            Bạn cần cung cấp thông tin tài khoản ngân hàng để nhận tiền khi bán vé thành công. Thông
            tin này sẽ được hiển thị cho người mua vé để họ chuyển khoản.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ngân hàng</label>
              <Select value={bankName} onValueChange={setBankName} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn ngân hàng" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_BANKS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Số tài khoản</label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="VD: 0123456789"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tên chủ tài khoản</label>
              <Input
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="VD: NGUYEN VAN A"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" disabled={mutation.isPending || isLoading}>
              {mutation.isPending ? 'Đang lưu...' : 'Lưu thông tin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
