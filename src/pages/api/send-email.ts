import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase'

interface RoomData {
  date: string
  room_type: string
  price: number | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, room } = req.body as { userId: string; room: RoomData }

    if (!userId || !room) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // 型アサーション
    const userEmail = (user as { email: string }).email

    // メール送信設定
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // メール内容
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: '【ミラコスタ】空室通知 - ' + room.date,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: white;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .room-info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e0e0e0;
              }
              .info-row:last-child {
                border-bottom: none;
              }
              .label {
                font-weight: bold;
                color: #666;
              }
              .value {
                color: #333;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 25px;
                margin: 20px 0;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                color: #999;
                padding: 20px;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏰 ミラコスタ空室通知</h1>
              </div>
              <div class="content">
                <p>ご登録いただいた条件に合致する空室が見つかりました！</p>
                
                <div class="room-info">
                  <div class="info-row">
                    <span class="label">📅 宿泊日</span>
                    <span class="value">${room.date}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">🛏️ 部屋タイプ</span>
                    <span class="value">${room.room_type}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">💰 料金</span>
                    <span class="value">${room.price ? `¥${room.price.toLocaleString()}` : '公式サイトでご確認ください'}</span>
                  </div>
                </div>

                <p style="text-align: center;">
                  <a href="${appUrl}/rooms" class="button">空室を確認する</a>
                </p>

                <p style="color: #e74c3c; font-weight: bold;">
                  ⚠️ 人気の日程・部屋タイプはすぐに埋まってしまう可能性があります。お早めにご予約をおすすめします。
                </p>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 12px; color: #666;">
                  通知設定の変更は<a href="${appUrl}/settings">こちら</a>から行えます。
                </p>
              </div>
              <div class="footer">
                <p>このメールは自動配信されています。</p>
                <p>&copy; 2024 ミラコスタ空室通知サービス</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    // メール送信
    await transporter.sendMail(mailOptions)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('メール送信エラー:', error)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
