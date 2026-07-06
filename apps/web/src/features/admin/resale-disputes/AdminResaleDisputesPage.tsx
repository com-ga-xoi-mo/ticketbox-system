import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../shared/ui/table';
import { Badge } from '../../../shared/ui/badge';

export function AdminResaleDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]); // Mocking for now, add API query later
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tranh chấp Resale P2P</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách chờ xử lý</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã Order</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Không có tranh chấp nào.
                  </TableCell>
                </TableRow>
              ) : (
                disputes.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.id}</TableCell>
                    <TableCell><Badge variant="destructive">{d.status}</Badge></TableCell>
                    <TableCell>{d.disputeReason}</TableCell>
                    <TableCell>{new Date(d.disputedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Chi tiết</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
