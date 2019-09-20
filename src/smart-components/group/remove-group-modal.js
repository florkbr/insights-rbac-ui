import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Modal, Button, Bullseye, Text, TextContent, TextVariants } from '@patternfly/react-core';
import { addNotification } from '@redhat-cloud-services/frontend-components-notifications/';
import { fetchGroups, fetchGroup, removeGroup } from '../../redux/actions/group-actions';

const RemoveGroupModal = ({
  history: { goBack, push },
  match: { params: { id }},
  removeGroup,
  group,
  isLoading,
  fetchGroup,
  fetchGroups
}) => {

  useEffect(() => {
    fetchGroup(id);
  }, []);

  const onSubmit = () => removeGroup(id)
  .then(() => {
    fetchGroups();
    push('/groups');
  });

  const onCancel = () => goBack();

  return (
    <Modal
      isOpen
      isSmall
      title = { '' }
      onClose={ onCancel }
      actions={ [
        <Button key="cancel" variant="secondary" type="button" onClick={ onCancel }>
          Cancel
        </Button>,
        <Button key="submit" isDisabled={ isLoading  }  variant="primary" type="button" onClick={ onSubmit }>
          Confirm
        </Button>
      ] }
    >
      <Bullseye>
        <TextContent>
          <Text component={ TextVariants.h1 }>
            Removing Group:  { group.name }
          </Text>
        </TextContent>
      </Bullseye>
    </Modal>
  );
};

RemoveGroupModal.defaultProps = {
  group: {},
  isLoading: true
};

RemoveGroupModal.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string
    }).isRequired
  }).isRequired,
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired
  }).isRequired,
  removeGroup: PropTypes.func.isRequired,
  fetchGroup: PropTypes.func.isRequired,
  addNotification: PropTypes.func.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  group: PropTypes.object
};

const mapStateToProps = ({ groupReducer: { selectedGroup, isRecordLoading }}) => ({
  group: selectedGroup,
  isLoading: isRecordLoading
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  addNotification,
  fetchGroup,
  fetchGroups,
  removeGroup
}, dispatch);

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(RemoveGroupModal));
