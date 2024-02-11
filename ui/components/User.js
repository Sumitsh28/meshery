import React, { useState, useEffect } from 'react';
import { List, ListItem } from '@material-ui/core';
import { Avatar } from '@layer5/sistent-components';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import IconButton from '@material-ui/core/IconButton';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import NoSsr from '@material-ui/core/NoSsr';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Provider, connect } from 'react-redux';
import { store } from '../store';
import { bindActionCreators } from 'redux';
import { useLazyGetLoggedInUserQuery, useLazyGetTokenQuery } from '@/rtk-query/user';
import { updateUser } from '../lib/store';
import ExtensionPointSchemaValidator from '../utils/ExtensionPointSchemaValidator';
import { styled } from '@mui/material/styles';

const LinkDiv = styled('div')(() => ({
  display: 'inline-flex',
  width: '100%',
  height: '30px',
  alignItems: 'self-end',
}));

function exportToJsonFile(jsonData, filename) {
  let dataStr = JSON.stringify(jsonData);
  let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  let exportFileDefaultName = filename;

  let linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  linkElement.remove();
}

const User = (props) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState([]);
  const [capabilitiesLoaded, setCapabilitiesLoaded] = useState(false);
  // const anchorEl = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const router = useRouter();

  const [triggerGetLoggedInUser] = useLazyGetLoggedInUserQuery();
  const [triggerGetToken] = useLazyGetTokenQuery();

  const { capabilitiesRegistry } = props;

  const handleToggle = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    window.location = '/user/logout';
  };

  const handlePreference = () => {
    router.push('/user/preferences');
  };

  const handleGetToken = () => {
    triggerGetToken()
      .unwrap()
      .then((data) => {
        exportToJsonFile(data, 'auth.json');
      })
      .catch((error) => {
        console.error('Error fetching token through useLazyGetTokenQuery() hook: ', error);
      });
  };

  useEffect(() => {
    triggerGetLoggedInUser()
      .unwrap()
      .then((userData) => {
        setUser(userData);
        props.updateUser({ user: userData });
      })
      .catch((error) => {
        console.error('Error fetching user through useLazyGetLoggedInUserQuery() hook: ', error);
      });
  }, []);

  useEffect(() => {
    if (!capabilitiesLoaded && capabilitiesRegistry) {
      setCapabilitiesLoaded(true); // to prevent re-compute
      setAccount(
        ExtensionPointSchemaValidator('account')(capabilitiesRegistry?.extensions?.account),
      );
    }
  }, [capabilitiesRegistry, capabilitiesLoaded]);

  /**
   * @param {import("../utils/ExtensionPointSchemaValidator").AccountSchema[]} children
   */
  function renderAccountExtension(children) {
    if (children && children.length > 0) {
      return (
        <List disablePadding>
          {children.map(({ id, href, title, show: showc }) => {
            if (typeof showc !== 'undefined' && !showc) {
              return '';
            }
            return (
              <React.Fragment key={id}>
                <ListItem button key={id}>
                  {extensionPointContent(href, title)}
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      );
    }
  }

  function extensionPointContent(href, name) {
    const { classes } = props;

    const content = (
      <LinkDiv>
        <ListItemText classes={{ primary: classes.itemPrimary }}>{name}</ListItemText>
      </LinkDiv>
    );
    if (href) {
      return (
        <Link href={href}>
          <span
            className={classNames(classes.link)}
            onClick={() => props.updateExtensionType(name)}
          >
            {content}
          </span>
        </Link>
      );
    }

    return content;
  }

  const { color, iconButtonClassName, avatarClassName, classes } = props;
  let avatar_url;
  if (user && user !== null) {
    avatar_url = user.avatar_url;
  }

  const open = Boolean(anchorEl);

  return (
    <div>
      <NoSsr>
        <div data-test="profile-button">
          <IconButton
            color={color}
            className={iconButtonClassName}
            ref={anchorEl}
            aria-owns={open ? 'menu-list-grow' : undefined}
            aria-haspopup="true"
            onClick={handleToggle}
          >
            <Avatar
              className={avatarClassName}
              src={avatar_url}
              imgProps={{ referrerPolicy: 'no-referrer' }}
            />
          </IconButton>
        </div>
        <Popper
          open={open}
          anchorEl={anchorEl}
          transition
          style={{ zIndex: 10000 }}
          placement="top-end"
          onClose={handleClose}
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              id="menu-list-grow"
              style={{
                transformOrigin: placement === 'bottom' ? 'left top' : 'left bottom',
              }}
            >
              <Paper className={classes.popover}>
                <ClickAwayListener onClickAway={handleClose}>
                  <MenuList>
                    {account && account.length ? <>{renderAccountExtension(account)}</> : null}
                    <MenuItem onClick={handleGetToken}>Get Token</MenuItem>
                    <MenuItem onClick={handlePreference}>Preferences</MenuItem>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </NoSsr>
    </div>
  );
};

const UserProvider = (props) => {
  return (
    <Provider store={store}>
      <User {...props} />
    </Provider>
  );
};

const mapDispatchToProps = (dispatch) => ({
  updateUser: bindActionCreators(updateUser, dispatch),
});

const mapStateToProps = (state) => ({
  capabilitiesRegistry: state.get('capabilitiesRegistry'),
});

export default connect(mapStateToProps, mapDispatchToProps)(UserProvider);
