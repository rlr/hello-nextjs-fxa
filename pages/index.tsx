import React from "react";
import Link from "next/link";
import Header from "../components/Header";
import "../styles/styles.scss";

interface Props {
  email?: string,
  avatar?: string,
}

class Home extends React.Component<Props> {
  static async getInitialProps({ req }: any) {
    if (req && req.session && req.session.user) {
      return { 
        email: req.session.user.email,
        avatar: req.session.user.avatar,
      };
    }
    return {};
  }

  render() {    
    return (
      <div>
        <Header />
        <h1>Home page</h1>

        {!this.props.email &&
          <Link href="/oauth/init">
            <button>Sign In</button>
          </Link>
        }
        {this.props.email &&
          <React.Fragment>
            {this.props.avatar &&
              <div>
                <img height="32" src={this.props.avatar} />
              </div>
            }
            <p>{this.props.email}</p>
            <Link href="/user/logout">
              <button>Sign Out</button>
            </Link>
          </React.Fragment>
        }
      </div>
    );
  }
}

export default Home;
