import sqlite3
db = sqlite3.connect('pos.db')
c = db.cursor()
tab = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print('TABLES:', tab)
for t in ['sales','sale_items','comprobantes','comprobante_items','pedidos','pedido_items','expenses','shifts','cash_movements','cash_closings','products','stock_movements','sync_queue','sync_logs','invoices','brands','categories','proveedores','users']:
    try:
        n = c.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        print(f'{t}:', n)
    except Exception as e:
        print(t, 'ERR', e)
print('--- LAST ROWS sync_queue ---')
try:
    for r in c.execute("SELECT id,entity,operation,status,created_at FROM sync_queue ORDER BY id DESC LIMIT 8").fetchall():
        print(r)
except Exception as e:
    print('sq ERR', e)
print('--- sample sales created_at ---')
try:
    for r in c.execute("SELECT id,total,payment_method,created_at FROM sales ORDER BY id DESC LIMIT 5").fetchall():
        print(r)
except Exception as e:
    print('sales ERR', e)
print('--- file mtime ---')
import os
print(os.path.getmtime('pos.db'), os.path.getsize('pos.db'))