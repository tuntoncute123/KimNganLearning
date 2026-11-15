import type { DrawStroke, Point } from '../types/document';
  // Vẽ mũi tên ở đầu đoạn thẳng
  const drawArrowHead = (
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    headLength: number = 14
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // Các hàm hỗ trợ hình học 3D
  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    isDashed: boolean = false
  ) => {
    ctx.save();
    if (isDashed) {
      ctx.setLineDash([7, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const drawEllipseArc = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    startAngle: number,
    endAngle: number,
    isDashed: boolean = false
  ) => {
    ctx.save();
    if (isDashed) {
      ctx.setLineDash([7, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 2), Math.max(ry, 2), 0, startAngle, endAngle);
    ctx.stroke();
    ctx.restore();
  };

  const drawPointDot = (
    ctx: CanvasRenderingContext2D,
    p: Point,
    radius: number = 3,
    fillColor: string = '#0f172a'
  ) => {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Render 1 nét vẽ trên Canvas 2D
  export const renderStroke = (ctx: CanvasRenderingContext2D, s: DrawStroke) => {
      if (s.points.length === 0) return;

      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = Math.max(16, s.width * 3);
      } else {
        ctx.globalAlpha = s.opacity ?? 1.0;
      }

      const p0 = s.points[0];
      const pLast = s.points[s.points.length - 1];

      switch (s.tool) {
        case 'pen':
        case 'highlighter': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y);
          }
          ctx.stroke();
          break;
        }

        case 'line': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.stroke();
          break;
        }

        case 'dashed-line': {
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.stroke();
          break;
        }

        case 'arrow': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.stroke();
          drawArrowHead(ctx, p0, pLast, Math.max(12, s.width * 3));
          break;
        }

        case 'rect': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          const rx = Math.min(p0.x, pLast.x);
          const ry = Math.min(p0.y, pLast.y);
          const rw = Math.abs(pLast.x - p0.x);
          const rh = Math.abs(pLast.y - p0.y);
          ctx.strokeRect(rx, ry, rw, rh);
          break;
        }

        case 'circle': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          const cx = (p0.x + pLast.x) / 2;
          const cy = (p0.y + pLast.y) / 2;
          const rx = Math.abs(pLast.x - p0.x) / 2;
          const ry = Math.abs(pLast.y - p0.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(rx, 2), Math.max(ry, 2), 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'triangle': {
          if (s.isDashed) ctx.setLineDash([7, 5]);
          const topX = (p0.x + pLast.x) / 2;
          const topY = p0.y;
          const botLeftX = p0.x;
          const botLeftY = pLast.y;
          const botRightX = pLast.x;
          const botRightY = pLast.y;

          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.lineTo(botLeftX, botLeftY);
          ctx.lineTo(botRightX, botRightY);
          ctx.closePath();
          ctx.stroke();
          break;
        }

        case 'right-angle': {
          const cornerX = p0.x;
          const cornerY = pLast.y;
          const arm1X = p0.x;
          const arm1Y = p0.y;
          const arm2X = pLast.x;
          const arm2Y = pLast.y;

          if (s.isDashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(arm1X, arm1Y);
          ctx.lineTo(cornerX, cornerY);
          ctx.lineTo(arm2X, arm2Y);
          ctx.stroke();

          const sz = Math.min(16, Math.abs(arm1Y - cornerY) / 3, Math.abs(arm2X - cornerX) / 3);
          if (sz > 4) {
            const dirX = arm2X > cornerX ? 1 : -1;
            const dirY = arm1Y > cornerY ? 1 : -1;

            ctx.beginPath();
            ctx.moveTo(cornerX + dirX * sz, cornerY);
            ctx.lineTo(cornerX + dirX * sz, cornerY + dirY * sz);
            ctx.lineTo(cornerX, cornerY + dirY * sz);
            ctx.stroke();
          }
          break;
        }

        case 'coordinate-axes': {
          const originX = (p0.x + pLast.x) / 2;
          const originY = (p0.y + pLast.y) / 2;
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);

          // Trục Ox
          ctx.beginPath();
          ctx.moveTo(minX, originY);
          ctx.lineTo(maxX, originY);
          ctx.stroke();
          drawArrowHead(ctx, { x: minX, y: originY }, { x: maxX, y: originY }, 12);

          // Trục Oy
          ctx.beginPath();
          ctx.moveTo(originX, maxY);
          ctx.lineTo(originX, minY);
          ctx.stroke();
          drawArrowHead(ctx, { x: originX, y: maxY }, { x: originX, y: minY }, 12);

          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('x', maxX - 6, originY + 16);
          ctx.fillText('y', originX + 8, minY + 14);
          ctx.fillText('O', originX - 14, originY + 14);
          break;
        }

        // =====================================================================
        // 6 HÌNH HỌC KHÔNG GIAN 3D (CHUẨN SGK TOÁN 11-12)
        // =====================================================================

        case 'cube-3d': {
          // Hình Hộp Chữ Nhật / Hình Lập Phương 3D
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const dx = w * 0.32;
          const dy = h * 0.28;

          // Mặt trước trực diện (A, B, C, D)
          const A = { x: minX, y: maxY };
          const B = { x: maxX - dx, y: maxY };
          const C = { x: maxX - dx, y: minY + dy };
          const D = { x: minX, y: minY + dy };

          // Mặt sau chiếu xiên (A', B', C', D')
          const A_prime = { x: minX + dx, y: maxY - dy }; // ĐỈNH KHUẤT
          const B_prime = { x: maxX, y: maxY - dy };
          const C_prime = { x: maxX, y: minY };
          const D_prime = { x: minX + dx, y: minY };

          // 3 cạnh khuất xuất phát từ đỉnh A' (Nét đứt chuẩn SGK)
          drawSegment(ctx, A, A_prime, true);
          drawSegment(ctx, A_prime, B_prime, true);
          drawSegment(ctx, A_prime, D_prime, true);

          // Các cạnh nhìn thấy (Nét liền, hoặc nét đứt nếu s.isDashed)
          const mainDashed = !!s.isDashed;
          drawSegment(ctx, A, B, mainDashed);
          drawSegment(ctx, B, C, mainDashed);
          drawSegment(ctx, C, D, mainDashed);
          drawSegment(ctx, D, A, mainDashed);

          drawSegment(ctx, B, B_prime, mainDashed);
          drawSegment(ctx, C, C_prime, mainDashed);
          drawSegment(ctx, D, D_prime, mainDashed);

          drawSegment(ctx, B_prime, C_prime, mainDashed);
          drawSegment(ctx, C_prime, D_prime, mainDashed);
          break;
        }

        case 'pyramid-3d': {
          // Hình Chóp Tứ Giác S.ABCD 3D (Đáy là hình bình hành)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          // Đáy ABCD: A (sau-trái - đỉnh khuất), B (sau-phải), D (trước-trái), C (trước-phải)
          const A = { x: minX + w * 0.28, y: maxY - h * 0.28 };
          const B = { x: maxX - w * 0.08, y: maxY - h * 0.28 };
          const D = { x: minX, y: maxY };
          const C = { x: D.x + (B.x - A.x), y: maxY };

          // Đỉnh chóp S
          const S = { x: minX + w * 0.42, y: minY };

          // Các cạnh khuất (Nét đứt)
          drawSegment(ctx, A, B, true); // Đáy sau AB
          drawSegment(ctx, A, D, true); // Đáy trái sau AD
          drawSegment(ctx, S, A, true); // Cạnh bên khuất SA

          // Các cạnh nhìn thấy (Nét liền)
          const mainDashed = !!s.isDashed;
          drawSegment(ctx, D, C, mainDashed); // Đáy trước DC
          drawSegment(ctx, B, C, mainDashed); // Đáy phải BC
          drawSegment(ctx, S, D, mainDashed); // Cạnh bên SD
          drawSegment(ctx, S, C, mainDashed); // Cạnh bên SC
          drawSegment(ctx, S, B, mainDashed); // Cạnh bên SB
          break;
        }

        case 'tetrahedron-3d': {
          // Tứ Diện / Hình Chóp Tam Giác S.ABC 3D
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          // Đáy ABC: A (trước-trái), B (trước-giữa), C (sau-phải)
          const A = { x: minX, y: maxY - h * 0.16 };
          const B = { x: minX + w * 0.48, y: maxY };
          const C = { x: maxX, y: maxY - h * 0.12 };

          // Đỉnh S
          const S = { x: minX + w * 0.42, y: minY };

          // Cạnh đáy sau AC khuất bên trong hình (Nét đứt)
          drawSegment(ctx, A, C, true);

          // Các cạnh nhìn thấy (Nét liền)
          const mainDashed = !!s.isDashed;
          drawSegment(ctx, A, B, mainDashed);
          drawSegment(ctx, B, C, mainDashed);
          drawSegment(ctx, S, A, mainDashed);
          drawSegment(ctx, S, B, mainDashed);
          drawSegment(ctx, S, C, mainDashed);
          break;
        }

        case 'cone-3d': {
          // Hình Nón 3D (Đáy elip, nửa sau nét đứt, trục SO & bán kính R)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const cx = (minX + maxX) / 2;
          const ry = Math.min(h * 0.16, w * 0.3, 30);
          const cy = maxY - ry;
          const rx = w / 2;

          const S = { x: cx, y: minY };
          const O = { x: cx, y: cy };
          const rightEdge = { x: cx + rx, y: cy };
          const leftEdge = { x: cx - rx, y: cy };

          // Đáy elip: nửa sau nét đứt, nửa trước nét liền
          drawEllipseArc(ctx, cx, cy, rx, ry, Math.PI, 2 * Math.PI, true);
          drawEllipseArc(ctx, cx, cy, rx, ry, 0, Math.PI, !!s.isDashed);

          // 2 đường sinh bên
          drawSegment(ctx, S, leftEdge, !!s.isDashed);
          drawSegment(ctx, S, rightEdge, !!s.isDashed);

          // Trục đường cao SO và bán kính đáy OM nét đứt
          drawSegment(ctx, S, O, true);
          drawSegment(ctx, O, rightEdge, true);
          drawPointDot(ctx, O, 2.5, s.color);
          break;
        }

        case 'cylinder-3d': {
          // Hình Trụ 3D (2 đáy elip, trục nối 2 tâm)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const cx = (minX + maxX) / 2;
          const ry = Math.min(h * 0.16, w * 0.28, 25);
          const rx = w / 2;
          const cyTop = minY + ry;
          const cyBot = maxY - ry;

          // Đáy trên: Elip trọn vẹn nét liền
          drawEllipseArc(ctx, cx, cyTop, rx, ry, 0, 2 * Math.PI, !!s.isDashed);

          // Đáy dưới: nửa sau nét đứt, nửa trước nét liền
          drawEllipseArc(ctx, cx, cyBot, rx, ry, Math.PI, 2 * Math.PI, true);
          drawEllipseArc(ctx, cx, cyBot, rx, ry, 0, Math.PI, !!s.isDashed);

          // 2 đường sinh 2 bên
          drawSegment(ctx, { x: cx - rx, y: cyTop }, { x: cx - rx, y: cyBot }, !!s.isDashed);
          drawSegment(ctx, { x: cx + rx, y: cyTop }, { x: cx + rx, y: cyBot }, !!s.isDashed);

          // Trục đối xứng nối 2 tâm O1 - O2 nét đứt
          drawSegment(ctx, { x: cx, y: cyTop }, { x: cx, y: cyBot }, true);
          drawPointDot(ctx, { x: cx, y: cyTop }, 2.5, s.color);
          drawPointDot(ctx, { x: cx, y: cyBot }, 2.5, s.color);
          break;
        }

        case 'sphere-3d': {
          // Hình Cầu 3D (Vòng tròn ngoài, xích đạo elip nửa đứt nửa liền, tâm & bán kính)
          const minX = Math.min(p0.x, pLast.x);
          const maxX = Math.max(p0.x, pLast.x);
          const minY = Math.min(p0.y, pLast.y);
          const maxY = Math.max(p0.y, pLast.y);
          const w = Math.max(maxX - minX, 24);
          const h = Math.max(maxY - minY, 24);

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const R = Math.min(w, h) / 2;
          const ry = R * 0.32;

          // Vòng tròn biên ngoài
          ctx.save();
          ctx.setLineDash(s.isDashed ? [7, 5] : []);
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Vòng xích đạo: nửa sau nét đứt, nửa trước nét liền
          drawEllipseArc(ctx, cx, cy, R, ry, Math.PI, 2 * Math.PI, true);
          drawEllipseArc(ctx, cx, cy, R, ry, 0, Math.PI, !!s.isDashed);

          // Tâm O và bán kính R nét đứt
          drawSegment(ctx, { x: cx, y: cy }, { x: cx + R, y: cy }, true);
          drawPointDot(ctx, { x: cx, y: cy }, 2.5, s.color);
          break;
        }

        case 'math-text': {
          if (!s.text) break;
          const fontSize = s.fontSize || 16;
          ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
          const metrics = ctx.measureText(s.text);
          const textWidth = metrics.width;
          const paddingH = 10;
          const paddingV = 6;
          const boxHeight = fontSize + paddingV * 2;
          const boxWidth = textWidth + paddingH * 2;

          // Thẻ badge nổi bật cho công thức toán
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.roundRect(p0.x, p0.y - fontSize - paddingV, boxWidth, boxHeight, 6);
          ctx.fill();
          ctx.shadowColor = 'transparent';

          ctx.strokeStyle = s.color || '#4f46e5';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = s.color || '#0f172a';
          ctx.fillText(s.text, p0.x + paddingH, p0.y - 2);
          break;
        }

        default:
          break;
      }

      ctx.restore();
    };
