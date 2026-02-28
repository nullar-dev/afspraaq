'use client';

import {
  Admin,
  Datagrid,
  EmailField,
  type GetListParams,
  type GetManyParams,
  type GetOneParams,
  List,
  Resource,
  TextField,
  type AuthProvider,
} from 'react-admin';

interface ProfileRow {
  id: string;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string | null;
  updated_at: string | null;
}

const requestJson = async (path: string) => {
  const response = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await response.json();

  if (!response.ok) {
    const message = body?.error?.message ?? 'Admin API request failed';
    throw new Error(message);
  }

  return body;
};

const dataProvider = {
  getList: async (_resource: string, params: GetListParams) => {
    const page = params.pagination?.page ?? 1;
    const perPage = params.pagination?.perPage ?? 25;
    const sortField = params.sort?.field ?? 'created_at';
    const sortOrder = params.sort?.order ?? 'DESC';

    const query = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      sortField,
      sortOrder,
    });

    const body = await requestJson(`/api/admin/profiles?${query.toString()}`);
    return {
      data: body.data as ProfileRow[],
      total: body.total as number,
    };
  },
  getOne: async (_resource: string, params: GetOneParams) => {
    const body = await requestJson(`/api/admin/profiles/${String(params.id)}`);
    return { data: body.data as ProfileRow };
  },
  getMany: async (_resource: string, params: GetManyParams) => {
    const ids = params.ids.map(String).join(',');
    const body = await requestJson(`/api/admin/profiles?ids=${encodeURIComponent(ids)}`);
    return { data: body.data as ProfileRow[] };
  },
  getManyReference: async () => ({ data: [], total: 0 }),
  update: async () => {
    throw new Error('Profile updates are not enabled yet.');
  },
  updateMany: async () => ({ data: [] }),
  create: async () => {
    throw new Error('Profile creation is managed by auth flow.');
  },
  delete: async () => {
    throw new Error('Profile deletion is not enabled.');
  },
  deleteMany: async () => ({ data: [] }),
} as const;

const getAdminSession = async () => {
  return requestJson('/api/admin/session');
};

const authProvider: AuthProvider = {
  login: async () => {
    throw new Error('Use the main login page to sign in.');
  },
  logout: async () => Promise.resolve(),
  checkError: async () => Promise.resolve(),
  checkAuth: async () => {
    await getAdminSession();
  },
  getIdentity: async () => {
    const session = await getAdminSession();
    return {
      id: session.user.id as string,
      fullName: session.user.email || 'Admin',
    };
  },
  getPermissions: async () => ['admin'],
};

const ProfileList = () => (
  <List resource="profiles" sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid bulkActionButtons={false}>
      <TextField source="id" />
      <EmailField source="email" />
      <TextField source="role" />
      <TextField source="created_at" />
      <TextField source="updated_at" />
    </Datagrid>
  </List>
);

export default function AdminApp() {
  return (
    <Admin dataProvider={dataProvider as never} authProvider={authProvider}>
      <Resource name="profiles" list={ProfileList} />
    </Admin>
  );
}
