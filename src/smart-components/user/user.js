import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link, useHistory, withRouter } from 'react-router-dom';
import debounce from 'lodash/debounce';
import { Button, Label, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { TopToolbar, TopToolbarTitle } from '../../presentational-components/shared/top-toolbar';
import { TableToolbarView } from '../../presentational-components/shared/table-toolbar-view';
import { Section, DateFormat, Skeleton } from '@redhat-cloud-services/frontend-components';
import { fetchRoles, fetchRoleForUser } from '../../redux/actions/role-actions';
import { fetchUsers } from '../../redux/actions/user-actions';
import { ListLoader } from '../../presentational-components/shared/loader-placeholders';
import { defaultSettings } from '../../helpers/shared/pagination';
import { Table, TableHeader, TableBody, TableVariant, compoundExpand } from '@patternfly/react-table';
import { Fragment } from 'react';
import EmptyWithAction from '../../presentational-components/shared/empty-state';
import './user.scss';

const columns = [
  'Roles',
  {
    title: 'Groups',
    cellTransforms: [compoundExpand],
  },
  {
    title: 'Permissions',
    cellTransforms: [compoundExpand],
  },
  {
    title: 'Last commit',
  },
];

let debouncedFetch;

const User = ({
  match: {
    params: { username },
  },
  fetchRoles,
  fetchRoleForUser,
  fetchUsers,
  roles,
  isLoading,
  rolesWithAccess,
  user,
}) => {
  useEffect(() => {
    fetchUsers({ ...defaultSettings, limit: 0, username });
    insights.chrome.appObjectId(username);
    return () => insights.chrome.appObjectId(undefined);
  }, []);

  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState({});
  const [userExists, setUserExists] = useState(true);

  const history = useHistory();

  const createRows = (data) => {
    return data
      ? data.reduce(
          (acc, { uuid, name, groups_in = [], modified, accessCount }, i) => [
            ...acc,
            {
              uuid,
              cells: [
                { title: name, props: { component: 'th', isOpen: false } },
                { title: `${groups_in.length}`, props: { isOpen: expanded[uuid] === 1 } },
                { title: accessCount, props: { isOpen: expanded[uuid] === 2 } },
                { title: <DateFormat type="exact" date={modified} /> },
              ],
            },
            {
              uuid: `${uuid}-groups`,
              parent: 3 * i,
              compoundParent: 1,
              cells: [
                {
                  props: { colSpan: 4, className: 'pf-m-no-padding' },
                  title: (
                    <Table
                      ouiaId="groups-in-role-nested-table"
                      aria-label="Simple Table"
                      variant={TableVariant.compact}
                      cells={['Name', 'Description']}
                      rows={groups_in.map((g) => ({ cells: [{ title: <Link to={`/groups/detail/${g.uuid}`}>{g.name}</Link> }, g.description] }))}
                    >
                      <TableHeader />
                      <TableBody />
                    </Table>
                  ),
                },
              ],
            },
            {
              uuid: `${uuid}-groups`,
              parent: 3 * i,
              compoundParent: 2,
              cells: [
                {
                  props: { colSpan: 4, className: 'pf-m-no-padding' },
                  title:
                    rolesWithAccess && rolesWithAccess[uuid] ? (
                      <Table
                        aria-label="Simple Table"
                        ouiaId="permissions-in-role-nested-table"
                        variant={TableVariant.compact}
                        cells={['Application', 'Resource type', 'Operation']}
                        rows={rolesWithAccess[uuid].access.map((access) => ({ cells: access.permission.split(':') }))}
                      >
                        <TableHeader />
                        <TableBody />
                      </Table>
                    ) : (
                      <ListLoader />
                    ),
                },
              ],
            },
          ],
          []
        )
      : [];
  };

  useEffect(() => {
    fetchRoles({ limit: 20, offset: 0, addFields: ['groups_in'], username }).then(({ value }) => {
      value?.error && setUserExists(false);
    });
    debouncedFetch = debounce(
      (limit, offset, name, addFields, username) =>
        fetchRoles({ limit, offset, name, addFields, username }).then(({ value }) => {
          value?.error && setUserExists(false);
        }),
      500
    );
  }, []);

  const onExpand = (_event, _rowIndex, colIndex, isOpen, rowData) => {
    if (!isOpen) {
      setExpanded({ ...expanded, [rowData.uuid]: colIndex });
      // Permissions
      if (colIndex === 2) {
        fetchRoleForUser(rowData.uuid);
      }
    } else {
      setExpanded({ ...expanded, [rowData.uuid]: -1 });
    }
  };

  const breadcrumbsList = () => [
    { title: 'Users', to: '/users' },
    { title: userExists ? username : 'Invalid user', isActive: true },
  ];

  return (
    <Fragment>
      {userExists ? (
        <Stack>
          <StackItem>
            <TopToolbar paddingBottm={false} breadcrumbs={breadcrumbsList()}>
              <TopToolbarTitle
                title={username}
                renderTitleTag={() =>
                  user && !isLoading ? (
                    <Label color={user?.is_active && 'green'}>{user?.is_active ? 'Active' : 'Inactive'}</Label>
                  ) : (
                    <Skeleton size="xs" className="ins-c-rbac__user-label-skeleton"></Skeleton>
                  )
                }
                description={`${username}'s roles, groups and permissions.`}
              />
            </TopToolbar>
          </StackItem>
          <StackItem>
            <Section type="content" id={'user-detail'}>
              <TableToolbarView
                columns={columns}
                isCompact={false}
                isExpandable={true}
                onExpand={onExpand}
                createRows={createRows}
                data={roles.data}
                filterValue={filter}
                ouiaId="user-details-table"
                fetchData={({ limit, offset, name }) => {
                  debouncedFetch(limit, offset, name, ['groups_in'], username);
                }}
                setFilterValue={({ name }) => setFilter(name)}
                isLoading={isLoading}
                pagination={roles.meta}
                filterPlaceholder="role name"
                titlePlural="roles"
                titleSingular="role"
                tableId="user"
              />
            </Section>
          </StackItem>
        </Stack>
      ) : (
        <TopToolbar breadcrumbs={breadcrumbsList()}>
          <Split hasGutter>
            <SplitItem isFilled>
              <EmptyWithAction
                title="User not found"
                description={[`User with username ${username} does not exist.`]}
                actions={[
                  <Button
                    key="back-button"
                    className="pf-u-mt-xl"
                    ouiaId="back-button"
                    variant="primary"
                    aria-label="Back to previous page"
                    onClick={() => history.goBack()}
                  >
                    Back to previous page
                  </Button>,
                ]}
              />
            </SplitItem>
          </Split>
        </TopToolbar>
      )}
    </Fragment>
  );
};

User.propTypes = {
  match: PropTypes.object,
  fetchRoles: PropTypes.func,
  fetchRoleForUser: PropTypes.func,
  fetchUsers: PropTypes.func,
  roles: PropTypes.object,
  isLoading: PropTypes.bool,
  rolesWithAccess: PropTypes.object,
  user: PropTypes.object,
};

const mapStateToProps = (
  {
    roleReducer: { roles, isLoading, rolesWithAccess },
    userReducer: {
      users: { data },
    },
  },
  {
    match: {
      params: { username },
    },
  }
) => ({
  roles,
  isLoading,
  rolesWithAccess,
  user: data && data.filter((user) => user.username === username)[0],
});
const mapDispatchToProps = (dispatch) => ({
  fetchRoles: (apiProps) => dispatch(fetchRoles(apiProps)),
  fetchRoleForUser: (uuid) => dispatch(fetchRoleForUser(uuid)),
  fetchUsers: (apiProps) => dispatch(fetchUsers(apiProps)),
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(User));
