import React from 'react';
import './App.css';
import {Routes, Route, useNavigate} from "react-router-dom";
import {Layout, Menu} from "antd";
import {PATH_GENERAL, PATH_MANUFACTURING, PATH_MACHINE} from "./router/paths";
import MachineList from "./pages/MachineList";
import Manufacturing from "./pages/Manufacturing";

const {Header, Sider} = Layout;

function App() {
    let navigate = useNavigate();
    const urlParams = window.location.search ? (Object.fromEntries(new URLSearchParams(window.location.search)) || {}) : {};
    return (
        <Layout style={{height: '100vh'}}>
            {!urlParams.hidesider &&
            <Sider>
                <div style={{color: '#333', backgroundColor: '#eee', padding: 10, fontWeight: 900}}>
                    하림산업 대시보드
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    defaultSelectedKeys={[window.location.pathname.substr(1)]}
                    onClick={({key}) => navigate(`/${key}`)}
                >
                    <Menu.Item key={PATH_MACHINE}>공정설비</Menu.Item>
                    <Menu.Item key={PATH_MANUFACTURING}>생산실적현황</Menu.Item>
                </Menu>
            </Sider>}
            <Layout style={{height: '100vh', overflow: 'auto', backgroundColor: '#fff'}}>
                <Routes>
                    <Route path={`/`} element={<MachineList/>}/>
                    <Route path={`/${PATH_MACHINE}`} element={<MachineList/>}/>
                    <Route path={`/${PATH_MANUFACTURING}`} element={<Manufacturing/>}/>
                </Routes>
            </Layout>
        </Layout>
    );
}

export default App;
