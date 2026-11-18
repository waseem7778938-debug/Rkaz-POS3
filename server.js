const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// إنشاء وتوصيل قاعدة البيانات المحلية
const dbFile = path.join(__dirname, 'rekaz.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات', err.message);
    } else {
        console.log('تم الاتصال بنجاح بقاعدة بيانات نظام ركاز.');
    }
});

// تهيئة الجداول الأساسية
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        UserID INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT UNIQUE,
        Password TEXT,
        FullName TEXT,
        Role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Items (
        ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
        Barcode TEXT UNIQUE,
        ItemName TEXT,
        Unit TEXT,
        SalePrice REAL,
        StockQty REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Invoices (
        InvoiceID INTEGER PRIMARY KEY AUTOINCREMENT,
        InvoiceNo TEXT,
        Date DATETIME DEFAULT CURRENT_TIMESTAMP,
        CustomerName TEXT,
        NetPayable REAL,
        Cashier TEXT
    )`);

    // إدخال مستخدم افتراضي (مدير النظام)
    db.run(`INSERT OR IGNORE INTO Users (Username, Password, FullName, Role) VALUES ('admin', '1234', 'مدير النظام', 'Supervisor')`);
    
    // إدخال أصناف تجريبية للتحقق
    db.run(`INSERT OR IGNORE INTO Items (Barcode, ItemName, Unit, SalePrice, StockQty) VALUES ('6281001', 'أرز بسمتي 5 كيلو', 'كيس', 45.00, 100)`);
    db.run(`INSERT OR IGNORE INTO Items (Barcode, ItemName, Unit, SalePrice, StockQty) VALUES ('6281002', 'زيت عافية 1.5 لتر', 'حبة', 18.50, 250)`);
    db.run(`INSERT OR IGNORE INTO Items (Barcode, ItemName, Unit, SalePrice, StockQty) VALUES ('628100123456', 'حليب طازج كامل الدسم 1 لتر', 'حبة', 6.00, 100)`);
    db.run(`INSERT OR IGNORE INTO Items (Barcode, ItemName, Unit, SalePrice, StockQty) VALUES ('628100987654', 'جبنة شيدر قابلة للدهن 500 جم', 'حبة', 18.00, 100)`);
});

// نقطة نهاية تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM Users WHERE Username = ? AND Password = ?`, [username, password], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (row) {
            res.json({ success: true, user: row.FullName, role: row.Role });
        } else {
            res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
    });
});

// البحث عن صنف بالباركود
app.get('/api/items/:barcode', (req, res) => {
    const barcode = req.params.barcode;
    db.get(`SELECT * FROM Items WHERE Barcode = ?`, [barcode], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (row) {
            res.json(row);
        } else {
            res.status(404).json({ message: 'الصنف غير موجود' });
        }
    });
});

// حفظ الفاتورة
app.post('/api/invoices', (req, res) => {
    const { InvoiceNo, CustomerName, NetPayable, Cashier } = req.body;
    db.run(`INSERT INTO Invoices (InvoiceNo, CustomerName, NetPayable, Cashier) VALUES (?, ?, ?, ?)`,
        [InvoiceNo, CustomerName, NetPayable, Cashier], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true, invoiceId: this.lastID });
            }
        });
});

app.listen(PORT, () => {
    console.log(`خادم نظام ركاز يعمل على البورت ${PORT}`);
});
