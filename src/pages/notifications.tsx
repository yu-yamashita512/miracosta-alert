import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

interface NotificationSetting {
  id: string;
  user_id: string;
  target_dates: string[] | null;
  target_room_types: string[] | null;
  notification_via_email: boolean | null;
  notification_via_line: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function Notifications() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSetting, setNewSetting] = useState({
    room_types: [] as string[],
    dates: [] as string[],
    notification_via_email: true,
    notification_via_line: false
  });

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }
    setUser(session.user);
    await loadSettings(session.user.id);
  }

  async function loadSettings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addSetting() {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .insert({
          user_id: user.id,
          target_room_types: newSetting.room_types,
          target_dates: newSetting.dates,
          notification_via_email: newSetting.notification_via_email,
          notification_via_line: newSetting.notification_via_line,
          is_active: true
        } as any);

      if (error) throw error;

      alert('通知設定を追加しました');
      await loadSettings(user.id);
      setNewSetting({
        room_types: [],
        dates: [],
        notification_via_email: true,
        notification_via_line: false
      });
    } catch (error: any) {
      alert('エラー: ' + error.message);
    }
  }

  async function toggleSetting(id: string, enabled: boolean) {
    try {
      const { error } = await (supabase
        .from('notification_settings')
        .update({ is_active: enabled }) as any)
        .eq('id', id);

      if (error) throw error;
      
      setSettings(settings.map(s => 
        s.id === id ? { ...s, is_active: enabled } : s
      ));
    } catch (error: any) {
      alert('エラー: ' + error.message);
    }
  }

  async function deleteSetting(id: string) {
    if (!confirm('この通知設定を削除しますか?')) return;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSettings(settings.filter(s => s.id !== id));
      alert('通知設定を削除しました');
    } catch (error: any) {
      alert('エラー: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">通知設定</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ダッシュボードに戻る
            </button>
          </div>

          {/* 新規設定追加フォーム */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">新しい通知を追加</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  部屋タイプ（複数選択可）
                </label>
                <div className="space-y-2">
                  {['ポルト・パラディーゾ・サイド スーペリアルーム（ハーバービュー）',
                    'ポルト・パラディーゾ・サイド スーペリアルーム（ピアッツァビュー）',
                    'ポルト・パラディーゾ・サイド バルコニールーム（ハーバービュー）',
                    'ポルト・パラディーゾ・サイド ハーバールーム（ハーバービュー）',
                    'トスカーナ・サイド スーペリアルーム',
                    'ヴェネツィア・サイド スーペリアルーム'
                  ].map(room => (
                    <label key={room} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newSetting.room_types.includes(room)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewSetting({ ...newSetting, room_types: [...newSetting.room_types, room] });
                          } else {
                            setNewSetting({ ...newSetting, room_types: newSetting.room_types.filter(r => r !== room) });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{room}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">未選択の場合は全部屋を監視</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  チェックイン日（カンマ区切りで複数指定可）
                </label>
                <input
                  type="text"
                  placeholder="例: 2025-12-20,2025-12-25,2026-01-05"
                  value={newSetting.dates.join(',')}
                  onChange={(e) => {
                    const dates = e.target.value ? e.target.value.split(',').map(d => d.trim()) : [];
                    setNewSetting({ ...newSetting, dates });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">未指定の場合は全日程を監視</p>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newSetting.notification_via_email}
                    onChange={(e) => setNewSetting({ ...newSetting, notification_via_email: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">メール通知</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newSetting.notification_via_line}
                    onChange={(e) => setNewSetting({ ...newSetting, notification_via_line: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">LINE通知</span>
                </label>
              </div>

              <button
                onClick={addSetting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                通知設定を追加
              </button>
            </div>
          </div>

          {/* 既存の設定一覧 */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">現在の通知設定</h2>
            {settings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">通知設定がありません</p>
            ) : (
              <div className="space-y-3">
                {settings.map((setting) => (
                  <div
                    key={setting.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 mb-2">
                          {!setting.target_room_types || setting.target_room_types.length === 0 
                            ? 'すべての部屋' 
                            : `${setting.target_room_types.length}種類の部屋`}
                        </div>
                        {setting.target_room_types && setting.target_room_types.length > 0 && (
                          <div className="text-sm text-gray-600 space-y-1">
                            {setting.target_room_types.map((room, idx) => (
                              <div key={idx}>• {room}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={setting.is_active || false}
                            onChange={(e) => toggleSetting(setting.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {setting.is_active ? '有効' : '無効'}
                          </span>
                        </label>

                        <button
                          onClick={() => deleteSetting(setting.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    <div className="mt-2">
                      {!setting.target_dates || setting.target_dates.length === 0 ? (
                        <p className="text-sm text-gray-500">全日程を監視</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {setting.target_dates.map((date, idx) => (
                            <span key={idx} className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {new Date(date).toLocaleDateString('ja-JP')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex gap-3 text-xs text-gray-500">
                      {setting.notification_via_email && <span>📧 メール</span>}
                      {setting.notification_via_line && <span>💬 LINE</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 説明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">通知の仕組み</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 設定した条件で空室が見つかった場合、メールで通知が届きます</li>
              <li>• 部屋タイプを指定すると、その部屋タイプのみ監視します</li>
              <li>• チェックイン日を指定すると、その日のみ監視します</li>
              <li>• 未指定の場合は、全部屋タイプ・全日程を監視します</li>
              <li>• 通知は1時間ごとに自動チェックされます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
