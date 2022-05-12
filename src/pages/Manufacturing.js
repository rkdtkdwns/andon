import React, {useContext, useEffect, useState} from 'react';
import {Typography, Descriptions, Button, Table, DatePicker, Space, Input, Modal, Spin} from 'antd';
import classNames from "classnames";
import {LeftOutlined, RightOutlined, LinkOutlined} from "@ant-design/icons";
import { makeStyles } from "@material-ui/core/styles";
import {fetchManufacturingStatus, fetchTagHistory, fetchTagStats} from "../db_service/service";
import { TinyLine, Line, DualAxes } from '@ant-design/plots';
import Moment from 'moment';


const styles = (theme) => ({

});


const useStyles = makeStyles(styles);

const Manufacturing = (props) => {
    const classes = useStyles(props);

    let start = new Moment().subtract(1, 'days');
    let end = new Moment();

    let [products, setProducts] = useState([]);

    useEffect(()=>{
        fetchManufacturingStatus().then(res=>{
            setProducts(res.data.rows);
        })
    }, []);

    return (
        <div>
            <div>품명 / 목표생산 / UOM / MRP / LINE</div>
            <br/>
            {products.map(e=>{
                return (
                    <div style={{marginBottom: 10}}>
                        {e['품명']} / {e['목표생산']} / {e['UOM']} / {e['MRP']} / {e['LINE']}
                    </div>
                )
            })}
        </div>
    );
};

export default Manufacturing;


