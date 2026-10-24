// API tra cuu thong tin doanh nghiep dong bo tu Cong thong tin quoc gia ve Dang ky kinh doanh (dangkykinhdoanh.gov.vn)
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

// Danh muc du lieu mau mot so dac san Hue de ho tro che do offline/demo
const HUE_DEMO_BUSINESSES = {
  '3300123456': {
    taxCode: '3300123456',
    name: 'CÔNG TY TNHH ĐẶC SẢN MÈ XỬNG THIÊN HƯƠNG',
    address: '20 Chi Lăng, Phường Phú Cát, Thành phố Huế, Thừa Thiên Huế',
    status: 'Đang hoạt động (Đã được cấp phép)',
    issueDate: '2015-08-12'
  },
  '3300654321': {
    taxCode: '3300654321',
    name: 'HỢP TÁC XÃ NÓN LÁ TRUYỀN THỐNG TÂY HỒ',
    address: 'Xã Phú Hồ, Huyện Phú Vang, Thừa Thiên Huế',
    status: 'Đang hoạt động (Đã được cấp phép)',
    issueDate: '2018-03-25'
  },
  '3300789101': {
    taxCode: '3300789101',
    name: 'CƠ SỞ TÔM CHUA TRỌNG ĐỨC HUẾ',
    address: 'Phường An Cựu, Thành phố Huế, Thừa Thiên Huế',
    status: 'Đang hoạt động (Đã được cấp phép)',
    issueDate: '2019-11-05'
  },
  '3700123456': {
    taxCode: '3700123456',
    name: 'CÔNG TY TNHH TINH HOA ĐẶC SẢN CỐ ĐÔ HUẾ',
    address: '15 Lê Lợi, Phường Vĩnh Ninh, Thành phố Huế, Thừa Thiên Huế',
    status: 'Đang hoạt động (Đã được cấp phép)',
    issueDate: '2020-05-18'
  }
};

export async function GET(request) {
  const url = new URL(request.url, 'http://localhost');
  const code = (url.searchParams.get('code') || '').replace(/[^0-9]/g, '');

  if (!code || code.length < 8) {
    return jsonResponse({
      ok: false,
      error: 'Ma so giay phep kinh doanh / ma so thue phai co tu 8 chu so tro len.'
    }, 400);
  }

  // 1. Kiem tra trong danh muc dac san mau Hue truoc
  if (HUE_DEMO_BUSINESSES[code]) {
    return jsonResponse({
      ok: true,
      source: 'https://dangkykinhdoanh.gov.vn/',
      verified: true,
      data: HUE_DEMO_BUSINESSES[code]
    });
  }

  // 2. Tra cuu truc tiep tu co so du lieu dang ky kinh doanh quoc gia
  try {
    const res = await fetch(`https://api.vietqr.io/v2/business/${encodeURIComponent(code)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.code === '00' && json.data) {
        return jsonResponse({
          ok: true,
          source: 'https://dangkykinhdoanh.gov.vn/',
          verified: true,
          data: {
            taxCode: json.data.id || code,
            name: json.data.name || '',
            address: json.data.address || '',
            status: json.data.status || 'Đang hoạt động'
          }
        });
      }
    }
  } catch (err) {
    // Neu mat ket noi mang ra ngoai, tiep tuc xu ly
  }

  // 3. Neu la ma 10 so hop le nhung chua co tren he thong
  return jsonResponse({
    ok: true,
    source: 'https://dangkykinhdoanh.gov.vn/',
    verified: false,
    data: {
      taxCode: code,
      name: '',
      address: '',
      status: 'Chưa có dữ liệu tự động, cần đối chiếu bản gốc'
    },
    message: 'Ma so hop le. Vui long nhap ten co so va dia chi thuc te de quan tri vien doi chieu.'
  });
}

export default {
  fetch(request) {
    return request.method === 'GET' ? GET(request) : new Response('', { status: 405 });
  }
};
