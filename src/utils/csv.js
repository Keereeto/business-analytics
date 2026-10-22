export const sendCsv = (res, rows, columns, filename) => {
  const escapeCsv = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    const text = String(value);

    if (/[",\r\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }

    return text;
  };

  const csv = [
    columns.join(','),
    ...rows.map(row =>
      columns.map(column => escapeCsv(row[column])).join(',')
    )
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  return res.status(200).send(csv);
};